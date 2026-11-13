// Sanity checks for the itinerary engine, dijalankan terhadap data nyata di database (hanya membaca, tidak mengubah apa pun).
//   npm run check:planner          (memakai DATABASE_URL dari .env)
// Pelanggaran invarian mesin = gagal (exit 1). Masalah kualitas data hanya dilaporkan sebagai peringatan.
import assert from "node:assert/strict";
import { INTERESTS, slotInfo, weekdayNames } from "../src/lib/culture";
import { getPlannerEvents, getPlannerObjects } from "../src/lib/culture-db";
import { eventOccursOn } from "../src/lib/kalender";
import { buildPlans, type PlanInput } from "../src/lib/planner";
import { prisma } from "../src/lib/prisma";

const DAY_MS = 86_400_000;
const ymd = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);

async function main() {
  const [objects, events] = await Promise.all([getPlannerObjects(), getPlannerEvents()]);
  const places = objects.filter((o) => !o.isEvent);
  const eventObjects = objects.filter((o) => o.isEvent);
  if (objects.length === 0) {
    console.log("Tidak ada data budaya yang tampil di database; tidak ada yang bisa diuji.");
    return;
  }

  // --- kualitas data (peringatan, bukan kegagalan) ------------------------------------------------
  const warnings: string[] = [];
  const slugs = new Set<string>();
  for (const o of objects) {
    if (slugs.has(o.slug)) warnings.push(`slug ganda: ${o.slug}`);
    slugs.add(o.slug);
    if (!(o.lat >= -90 && o.lat <= 90 && o.lng >= -180 && o.lng <= 180)) warnings.push(`${o.slug}: koordinat tidak valid`);
    if (o.meaning.length < 40) warnings.push(`${o.slug}: makna budaya terlalu singkat`);
    if (!o.isEvent) {
      if (o.slots.length === 0) warnings.push(`${o.slug}: tidak punya waktu kunjungan`);
      else if (!o.slots.some((s) => o.durationMin <= slotInfo[s].capacityMin)) warnings.push(`${o.slug}: lama kunjungan tidak muat di slot mana pun`);
    }
  }
  const uncovered = INTERESTS.filter((i) => !objects.some((o) => o.interest === i));
  if (uncovered.length > 0) warnings.push(`belum ada data untuk minat: ${uncovered.join(", ")}`);

  // --- skenario -----------------------------------------------------------------------------------
  // Minat yang paling banyak punya data, supaya skenario "dengan minat" benar-benar punya bahan.
  const counts = new Map<string, number>();
  for (const o of objects) counts.set(o.interest, (counts.get(o.interest) ?? 0) + 1);
  const topInterests = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([i]) => i) as PlanInput["interests"];

  const start = ymd(1);
  const base: PlanInput = {
    startDate: start,
    endDate: ymd(3),
    adults: 2,
    children: 1,
    budget: 7_000_000,
    originCost: 0,
    lodging: "STANDAR",
    rooms: 1,
    includeSouvenir: true,
    includeMeals: true,
    transport: "UMUM",
    pace: "SEIMBANG",
    interests: topInterests,
    depth: "BELAJAR",
    spreadTourism: false,
  };

  const scenarios: [string, PlanInput][] = [
    ["default", base],
    ["no interests", { ...base, interests: [] }],
    ["spread tourism", { ...base, spreadTourism: true }],
    ["one day", { ...base, endDate: start, budget: undefined }],
    ["tight budget", { ...base, budget: 5_000_000 }],
    ["impossible budget", { ...base, budget: 800_000 }],
    ["week", { ...base, endDate: ymd(7), budget: undefined }],
  ];

  for (const [label, input] of scenarios) {
    for (const plan of buildPlans(objects, events, input)) {
      const tag = `${label}/${plan.style}`;
      const ids = plan.days.flatMap((d) => d.items.map((i) => i.object.id));
      assert.equal(new Set(ids).size, ids.length, `${tag}: object repeated`);

      for (const day of plan.days) {
        const weekday = weekdayNames.indexOf(day.weekday as (typeof weekdayNames)[number]);
        const slots = day.items.map((i) => i.slot);
        assert.equal(new Set(slots).size, slots.length, `${tag}: slot used twice on day ${day.dayIndex}`);
        for (const it of day.items) {
          if (it.object.isEvent) {
            // Event mandiri hanya boleh dijadwalkan pada tanggal event-nya berlangsung (jam acara menentukan slot).
            assert(it.object.schedules?.some((s) => eventOccursOn(s, day.date)), `${tag}: ${it.object.name} scheduled when it is not happening`);
          } else {
            assert(it.object.weekdays.length === 0 || it.object.weekdays.includes(weekday), `${tag}: ${it.object.name} not open on ${day.weekday}`);
            assert(it.object.slots.includes(it.slot), `${tag}: ${it.object.name} in a slot it does not offer`);
          }
          assert(it.reasons.length > 0, `${tag}: ${it.object.name} has no reason`);
        }
      }

      const sum = plan.costs.tickets + plan.costs.meals + plan.costs.local + plan.costs.lodging + plan.costs.origin;
      assert.equal(sum, plan.total, `${tag}: total mismatch`);
      assert(plan.impactIdr <= plan.costs.tickets, `${tag}: impact exceeds tickets`);

      if (input.budget !== undefined) {
        const fixed = plan.total - plan.costs.tickets;
        const over = plan.total > input.budget;
        if (over) assert(fixed > input.budget * 0.9 || plan.notes.length > 0, `${tag}: over budget without a note`);
        if (!over) assert.equal(plan.remaining, input.budget - plan.total, `${tag}: remaining mismatch`);
      }
    }
  }

  // A budget that cannot cover the basics must only offer free places, and say so.
  for (const plan of buildPlans(objects, events, { ...base, budget: 800_000 })) {
    assert(plan.costs.tickets === 0, "impossible budget: paid places offered");
    assert(plan.notes.some((n) => n.includes("belum cukup")), "impossible budget: no explanation");
  }

  // Tempo, wilayah, makan, dan moda transportasi memengaruhi hasil sebagaimana mestinya.
  const longTrip = { ...base, endDate: ymd(7), budget: undefined };
  for (const plan of buildPlans(objects, events, { ...longTrip, pace: "SANTAI" })) {
    assert(plan.days.every((d) => d.items.length <= 2), `santai/${plan.style}: more than 2 places in a day`);
  }
  for (const plan of buildPlans(objects, events, { ...longTrip, pace: "PADAT" })) {
    assert(plan.days.every((d) => d.items.length <= 4), `padat/${plan.style}: more than 4 places in a day`);
  }
  const zone = objects[0].zone;
  for (const plan of buildPlans(objects, events, { ...base, zone })) {
    assert(plan.days.every((d) => d.items.every((i) => i.object.zone === zone)), `zone ${zone}: place from another zone`);
  }
  for (const plan of buildPlans(objects, events, { ...base, includeMeals: false })) {
    assert.equal(plan.costs.meals, 0, "includeMeals=false: meals still counted");
  }
  for (const plan of buildPlans(objects, events, { ...base, transport: "NONE" })) {
    assert.equal(plan.costs.local, 0, "transport NONE: local cost counted");
  }

  // Event mandiri sekali tayang (bila ada di data): masuk rencana pada tanggalnya bila minat dan wilayahnya cocok.
  const oneOff = eventObjects.find((o) => o.schedules?.some((s) => s.startsOn && s.weekdays.length === 0 && !s.repeatsYearly));
  if (oneOff) {
    const date = oneOff.schedules!.find((s) => s.startsOn && s.weekdays.length === 0 && !s.repeatsYearly)!.startsOn!;
    const input: PlanInput = { ...base, startDate: date, endDate: date, budget: undefined, interests: [oneOff.interest], zone: oneOff.zone };
    for (const plan of buildPlans(objects, events, input)) {
      assert(plan.days[0].items.some((i) => i.object.id === oneOff.id), `event "${oneOff.name}" missing on its date (${plan.style})`);
    }
  }

  for (const w of warnings) console.warn(`PERINGATAN: ${w}`);
  console.log(
    `OK: ${places.length} destinasi + ${eventObjects.length} event, ${scenarios.length} skenario x 3 rencana diperiksa` +
      (warnings.length ? ` (${warnings.length} peringatan data)` : "") +
      ".",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
