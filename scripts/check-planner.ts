// Sanity checks for the itinerary engine, run against the Yogyakarta seed data (no database needed).
//   npm run check:planner
import assert from "node:assert/strict";
import { yogyakartaEvents, yogyakartaObjects } from "../prisma/data/yogyakarta";
import { INTERESTS, slotInfo, weekdayNames } from "../src/lib/culture";
import { buildPlans, type PlanInput, type PlannerObject } from "../src/lib/planner";

const objects: PlannerObject[] = yogyakartaObjects.map((o, i) => ({
  id: `o${i}`,
  slug: o.slug,
  name: o.name,
  kind: o.kind,
  interest: o.interest,
  alsoInterests: o.alsoInterests ?? [],
  zone: o.zone,
  lat: o.lat,
  lng: o.lng,
  summary: o.summary,
  meaning: o.meaning,
  etiquette: o.etiquette,
  priceIdr: o.priceIdr,
  durationMin: o.durationMin,
  depth: o.depth,
  slots: o.slots,
  weekdays: o.weekdays ?? [],
  scheduleNote: o.scheduleNote ?? null,
  localRun: !!o.localRun,
  hiddenGem: !!o.hiddenGem,
  status: "SEED",
  imageUrl: null,
}));
const events = yogyakartaEvents.map((e) => ({
  slug: e.slug,
  title: e.title,
  monthHint: e.monthHint ?? null,
  dateNote: e.dateNote,
  startsOn: null,
  endsOn: null,
}));

const base: PlanInput = {
  startDate: "2026-11-11",
  endDate: "2026-11-13",
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
  interests: ["SENI_PERTUNJUKAN", "KERAJINAN"],
  depth: "BELAJAR",
  spreadTourism: false,
};

// --- seed data sanity -------------------------------------------------------------------------
const slugs = new Set<string>();
for (const o of yogyakartaObjects) {
  assert(!slugs.has(o.slug), `duplicate slug ${o.slug}`);
  slugs.add(o.slug);
  assert(o.lat < -7 && o.lat > -9 && o.lng > 109.5 && o.lng < 111, `${o.slug}: coordinates outside DIY`);
  assert(o.slots.length > 0, `${o.slug}: no slots`);
  assert(o.meaning.length >= 40 && o.etiquette.length > 0, `${o.slug}: missing meaning/etiquette`);
  assert(o.slots.some((s) => o.durationMin <= slotInfo[s].capacityMin), `${o.slug}: duration fits no slot`);
}
for (const i of INTERESTS) assert(yogyakartaObjects.some((o) => o.interest === i), `no object for interest ${i}`);

// --- plan invariants --------------------------------------------------------------------------
const scenarios: [string, PlanInput][] = [
  ["default", base],
  ["no interests", { ...base, interests: [] }],
  ["spread tourism", { ...base, spreadTourism: true }],
  ["one day", { ...base, endDate: "2026-11-11", budget: undefined }],
  ["tight budget", { ...base, budget: 5_000_000 }],
  ["impossible budget", { ...base, budget: 800_000 }],
  ["week", { ...base, endDate: "2026-11-17", budget: undefined }],
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
        assert(it.object.weekdays.length === 0 || it.object.weekdays.includes(weekday), `${tag}: ${it.object.name} not open on ${day.weekday}`);
        assert(it.object.slots.includes(it.slot), `${tag}: ${it.object.name} in a slot it does not offer`);
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
for (const plan of buildPlans(objects, events, { ...base, pace: "SANTAI", endDate: "2026-11-17", budget: undefined })) {
  assert(plan.days.every((d) => d.items.length <= 2), `santai/${plan.style}: more than 2 places in a day`);
}
for (const plan of buildPlans(objects, events, { ...base, pace: "PADAT", endDate: "2026-11-17", budget: undefined })) {
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

console.log(`OK: ${yogyakartaObjects.length} objects, ${scenarios.length} scenarios x 3 plans checked.`);
