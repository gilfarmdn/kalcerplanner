// Explainable itinerary engine (rule-based, deterministic).
// Pure TypeScript: it takes cultural objects/events as plain data and returns up to three plans
// ("Seimbang", "Mendalam & Berdampak", "Hemat Cerdas"). Every item carries human-readable reasons,
// so the UI can show *why* it was recommended instead of a black-box list.

import {
  COST,
  formatRupiah,
  interestInfo,
  lodgingInfo,
  monthNames,
  transportInfo,
  slotInfo,
  SLOTS,
  weekdayNames,
  type Depth,
  type Interest,
  type Lodging,
  type ObjectKind,
  type Pace,
  type PlanStyle,
  type Slot,
  type Transport,
} from "./culture";
import { eventOccursOn, type EventSchedule } from "./kalender";

export type PlannerObject = {
  id: string;
  slug: string;
  name: string;
  kind: ObjectKind;
  interest: Interest;
  alsoInterests: Interest[];
  zone: string;
  lat: number;
  lng: number;
  summary: string;
  meaning: string;
  etiquette: string[];
  priceIdr: number;
  childPriceIdr?: number | null;
  durationMin: number;
  depth: Depth;
  slots: Slot[];
  weekdays: number[];
  scheduleNote: string | null;
  localRun: boolean;
  hiddenGem: boolean;
  status: string;
  imageUrl: string | null;
  /** Event budaya: hanya dijadwalkan pada tanggal salah satu `schedules` berlangsung. */
  isEvent?: boolean;
  /** Kuota pendaftaran per tanggal; null = tanpa pendaftaran. */
  dailyQuota?: number | null;
  openTime?: string | null;
  closeTime?: string | null;
  schedules?: EventSchedule[];
};

export type PlannerEvent = {
  slug: string;
  title: string;
  /** Objek / event terkait; catatan kalender dilewati bila itu sudah masuk jadwal. */
  objectSlug?: string | null;
  monthHint: number | null;
  dateNote: string;
  startsOn: Date | string | null;
  endsOn: Date | string | null;
};

export type PlanInput = {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  adults: number;
  children: number;
  budget?: number;
  originCost: number; // user's own estimate for the trip to/from the destination
  lodging: Lodging;
  rooms: number;
  includeSouvenir: boolean;
  /** true = anggaran sudah mencakup makan; false = makan tidak dihitung. */
  includeMeals: boolean;
  transport: Transport;
  interests: Interest[];
  depth: Depth;
  /** Tempo: jumlah destinasi per hari. */
  pace: Pace;
  spreadTourism: boolean;
  /** Wilayah tujuan (nilai `zone` objek). Kosong = semua wilayah. */
  zone?: string;
};

export type PlannedItem = {
  object: PlannerObject;
  dayIndex: number;
  slot: Slot;
  /** Total ticket cost for the whole group (Rp). */
  priceIdr: number;
  reasons: string[];
};

export type PlanDay = { dayIndex: number; date: string; weekday: string; items: PlannedItem[] };

export type Plan = {
  style: PlanStyle;
  title: string;
  description: string;
  days: PlanDay[];
  costs: { tickets: number; meals: number; local: number; lodging: number; origin: number };
  total: number;
  /** Rp of tickets/classes flowing to locally run institutions and practitioners. */
  impactIdr: number;
  localShare: number; // 0..1 of ticket spend
  hiddenGemCount: number;
  itemCount: number;
  remaining: number | null;
  souvenirAllowance: number;
  notes: string[];
};

const MAX_DAYS = 7;
const DAY_MS = 86_400_000;

const parseDay = (s: string) => Date.parse(`${s}T00:00:00.000Z`);
const toIsoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function tripDays(startDate: string, endDate: string): number {
  const n = Math.round((parseDay(endDate) - parseDay(startDate)) / DAY_MS) + 1;
  return Math.min(MAX_DAYS, Math.max(1, Number.isFinite(n) ? n : 1));
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Bonus skor event: kesempatannya terbatas pada tanggal tertentu. */
const EVENT_BONUS = 1.2;

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** Slot untuk jam tertentu (batas sama dengan form pelaku). */
function slotAt(min: number): Slot {
  if (min < 12 * 60) return "PAGI";
  if (min < 15 * 60) return "SIANG";
  if (min < 18 * 60) return "SORE";
  return "MALAM";
}

/** Slot yang terpakai sepanjang jam acara event (mis. 10:00–16:00 = Pagi, Siang, Sore). */
function eventSlots(o: PlannerObject): Slot[] {
  if (!o.openTime) return o.slots.length ? o.slots : ["PAGI"];
  const first = SLOTS.indexOf(slotAt(toMin(o.openTime)));
  const end = o.closeTime ? toMin(o.closeTime) : 0;
  const last = end > toMin(o.openTime) ? SLOTS.indexOf(slotAt(end - 1)) : first;
  return SLOTS.slice(first, last + 1);
}

const depthRank: Record<Depth, number> = { LIHAT: 0, BELAJAR: 1, TERLIBAT: 2 };

type StyleConfig = {
  title: string;
  description: string;
  maxPerDay: number;
  wInterest: number;
  wDepth: number;
  wLocal: number;
  wHidden: number;
  /** Bonus for well-known (non hidden-gem) places unless the user asks to spread visits. */
  wIconic: number;
  wPrice: number;
  wDist: number;
};

const STYLE_CONFIG: Record<PlanStyle, StyleConfig> = {
  SEIMBANG: {
    title: "Seimbang",
    description: "Paduan minat, jarak yang masuk akal, dan ritme santai: 2–3 pengalaman per hari.",
    maxPerDay: 3,
    wInterest: 1.6,
    wDepth: 0.6,
    wLocal: 0.5,
    wHidden: 0.2,
    wIconic: 0.6,
    wPrice: 0.1,
    wDist: 0.1,
  },
  MENDALAM: {
    title: "Mendalam & Berdampak",
    description: "Lebih sedikit tempat, lebih dalam: memprioritaskan belajar langsung dan pelaku budaya setempat.",
    maxPerDay: 2,
    wInterest: 1.6,
    wDepth: 1.4,
    wLocal: 0.9,
    wHidden: 0.3,
    wIconic: 0,
    wPrice: 0,
    wDist: 0.08,
  },
  HEMAT: {
    title: "Hemat Cerdas",
    description: "Menekan biaya tiket tanpa kehilangan makna: banyak pilihan murah atau gratis yang kaya cerita.",
    maxPerDay: 3,
    wInterest: 1.6,
    wDepth: 0.3,
    wLocal: 0.3,
    wHidden: 0.4,
    wIconic: 0.3,
    wPrice: 1.3,
    wDist: 0.1,
  },
};

function interestMatch(o: PlannerObject, wanted: Interest[]): number {
  if (wanted.length === 0) return 1.5;
  if (wanted.includes(o.interest)) return 3;
  if (o.alsoInterests.some((i) => wanted.includes(i))) return 1.5;
  return 0;
}

function baseScore(o: PlannerObject, input: PlanInput, cfg: StyleConfig): number {
  const match = interestMatch(o, input.interests);
  let s = cfg.wInterest * match;
  const depthFit = 1 - 0.5 * Math.abs(depthRank[o.depth] - depthRank[input.depth]);
  s += cfg.wDepth * depthFit * (match > 0 ? 1 : 0.3);
  if (o.localRun) s += cfg.wLocal;
  if (o.hiddenGem) s += input.spreadTourism ? 1.6 : cfg.wHidden;
  else if (input.spreadTourism) s -= 0.4;
  else s += cfg.wIconic;
  s -= cfg.wPrice * (o.priceIdr / 100_000);
  if (o.isEvent) s += EVENT_BONUS;
  return s;
}

const groupTicket = (o: PlannerObject, adults: number, children: number) =>
  Math.round(o.priceIdr * adults + (o.childPriceIdr ?? o.priceIdr) * children);
function fixedCosts(input: PlanInput, days: number) {
  const nights = Math.max(0, days - 1);
  const meals = input.includeMeals
    ? Math.round(days * (input.adults * COST.mealPerAdultDay + input.children * COST.mealPerAdultDay * COST.childFactor))
    : 0;
  const local = days * transportInfo[input.transport].perDay;
  const lodging = nights * input.rooms * lodgingInfo[input.lodging].perRoomNight;
  return { meals, local, lodging, origin: input.originCost };
}

function buildPlan(
  style: PlanStyle,
  objects: PlannerObject[],
  events: PlannerEvent[],
  input: PlanInput,
): Plan {
  const cfg = STYLE_CONFIG[style];
  const days = tripDays(input.startDate, input.endDate);
  const startMs = parseDay(input.startDate);
  const fixed = fixedCosts(input, days);
  const fixedTotal = fixed.meals + fixed.local + fixed.lodging + fixed.origin;

  const notes: string[] = [];
  const hasBudget = typeof input.budget === "number" && input.budget > 0;
  const souvenirReserve = input.includeSouvenir && hasBudget ? Math.max(100_000, Math.ceil((input.budget! * 0.05) / 10_000) * 10_000) : 0;
  const ticketBudget = hasBudget ? input.budget! - fixedTotal - souvenirReserve : Infinity;

  // Tempo menentukan batas destinasi per hari (dibatasi juga oleh jumlah slot waktu).
  const dayCap =
    input.pace === "SANTAI"
      ? Math.min(cfg.maxPerDay, 2)
      : input.pace === "PADAT"
        ? Math.min(SLOTS.length, cfg.maxPerDay + 1)
        : cfg.maxPerDay;

  // Hanya objek di wilayah yang dipilih (kosong = semua wilayah).
  const pool = input.zone ? objects.filter((o) => o.zone === input.zone) : objects;
  const scored = pool.map((o) => ({ o, base: baseScore(o, input, cfg) }));
  const used = new Set<string>();
  const chosen: PlannedItem[] = [];
  const scoreById = new Map<string, number>();

  // If the budget cannot even cover the basics, only free places are offered.
  const onlyFree = hasBudget && ticketBudget < 0;

  // Event yang cocok dengan minat (atau semua event bila minat tidak dipilih).
  const eventPool = scored
    .filter(({ o }) => o.isEvent && (input.interests.length === 0 || interestMatch(o, input.interests) > 0))
    .sort((a, b) => b.base - a.base);

  for (let d = 0; d < days; d++) {
    const weekday = new Date(startMs + d * DAY_MS).getUTCDay();
    const date = toIsoDay(startMs + d * DAY_MS);
    const dayItems: PlannedItem[] = [];
    const freeSlots = new Set<Slot>(SLOTS);

    // Event lebih dulu: tanggalnya tetap, sedangkan destinasi biasa bisa digeser ke hari lain.
    for (const { o, base } of eventPool) {
      if (dayItems.length >= dayCap) break;
      if (used.has(o.id)) continue;
      if (onlyFree && o.priceIdr > 0) continue;
      if (!o.schedules?.some((e) => eventOccursOn(e, date))) continue;
      const slots = eventSlots(o);
      if (!slots.every((s) => freeSlots.has(s))) continue;

      used.add(o.id);
      slots.forEach((s) => freeSlots.delete(s));
      scoreById.set(o.id, base);
      dayItems.push({
        object: o,
        dayIndex: d,
        slot: slots[0],
        priceIdr: groupTicket(o, input.adults, input.children),
        reasons: [],
      });
    }

    while (dayItems.length < dayCap && freeSlots.size > 0) {
      let best: { o: PlannerObject; slot: Slot; score: number } | null = null;

      for (const { o, base } of scored) {
        if (o.isEvent || used.has(o.id)) continue;
        if (onlyFree && o.priceIdr > 0) continue;
        if (o.weekdays.length > 0 && !o.weekdays.includes(weekday)) continue;

        let score = base;
        if (dayItems.length > 0) {
          const nearest = Math.min(...dayItems.map((it) => haversineKm(it.object, o)));
          score -= cfg.wDist * Math.min(nearest, 40);
        }

        const allowed = (o.slots.length ? o.slots : SLOTS).filter(
          (s) => freeSlots.has(s) && o.durationMin <= slotInfo[s].capacityMin,
        );
        if (allowed.length === 0) continue;
        // Prefer the earliest allowed slot so the day stays in chronological order.
        const slot = SLOTS.find((s) => allowed.includes(s))!;

        if (!best || score > best.score + 1e-9) best = { o, slot, score };
      }

      if (!best) break;
      used.add(best.o.id);
      freeSlots.delete(best.slot);
      scoreById.set(best.o.id, best.score);
      dayItems.push({
        object: best.o,
        dayIndex: d,
        slot: best.slot,
        priceIdr: groupTicket(best.o, input.adults, input.children),
        reasons: [],
      });
    }
    chosen.push(...dayItems);
  }

  // Trim to the budget: drop the paid item with the lowest value per rupiah until it fits.
  let trimmed = false;
  if (Number.isFinite(ticketBudget) && ticketBudget >= 0) {
    let tickets = chosen.reduce((n, it) => n + it.priceIdr, 0);
    while (tickets > ticketBudget) {
      const paid = chosen.filter((it) => it.priceIdr > 0);
      if (paid.length === 0) break;
      paid.sort(
        (a, b) =>
          (scoreById.get(a.object.id)! / a.priceIdr) - (scoreById.get(b.object.id)! / b.priceIdr),
      );
      const drop = paid[0];
      chosen.splice(chosen.indexOf(drop), 1);
      tickets -= drop.priceIdr;
      trimmed = true;
    }
  }

  // Reasons (explainability).
  for (const it of chosen) {
    const o = it.object;
    const r: string[] = [];
    if (input.interests.length === 0) r.push(`Tema: ${interestInfo[o.interest].label}`);
    else if (input.interests.includes(o.interest)) r.push(`Sesuai minatmu: ${interestInfo[o.interest].label}`);
    else if (o.alsoInterests.some((i) => input.interests.includes(i))) {
      const i = o.alsoInterests.find((x) => input.interests.includes(x))!;
      r.push(`Menyentuh minatmu: ${interestInfo[i].label}`);
    } else r.push(`Pelengkap hari ini (di luar minat utama)`);

    if (o.depth === input.depth && input.depth !== "LIHAT") {
      r.push(input.depth === "TERLIBAT" ? "Kamu bisa terlibat langsung" : "Ada pemandu / pelaku yang menjelaskan");
    }
    if (o.localRun) r.push("Dikelola komunitas / pelaku setempat — uangmu langsung ke mereka");
    if (o.hiddenGem) r.push("Relatif tidak padat — membantu menyebar kunjungan wisata");
    if (o.priceIdr === 0) r.push("Gratis / donasi sukarela");
    if (o.isEvent) {
      const jam = o.openTime ? ` pukul ${o.openTime.replace(":", ".")}${o.closeTime ? `–${o.closeTime.replace(":", ".")}` : ""} WIB` : "";
      r.push(`Event budaya yang berlangsung pada tanggal ini${jam}`);
    } else if (o.weekdays.length > 0) r.push(`Tersedia pada hari ${weekdayNames[new Date(startMs + it.dayIndex * DAY_MS).getUTCDay()]}`);

    const sameDay = chosen.filter((x) => x.dayIndex === it.dayIndex && x !== it);
    if (sameDay.length > 0) {
      const km = Math.min(...sameDay.map((x) => haversineKm(x.object, o)));
      if (km <= 3) r.push(`Searah dengan agenda lain hari itu (±${Math.max(1, Math.round(km))} km)`);
    }
    it.reasons = r;
  }

  const costs = {
    tickets: chosen.reduce((n, it) => n + it.priceIdr, 0),
    meals: fixed.meals,
    local: fixed.local,
    lodging: fixed.lodging,
    origin: fixed.origin,
  };
  const total = costs.tickets + costs.meals + costs.local + costs.lodging + costs.origin;
  const remaining = hasBudget ? Math.max(0, input.budget! - total) : null;
  const souvenirAllowance = input.includeSouvenir ? (remaining ?? 0) : 0;

  const impactIdr = chosen.filter((it) => it.object.localRun).reduce((n, it) => n + it.priceIdr, 0);
  const localShare = costs.tickets > 0 ? impactIdr / costs.tickets : 0;
  const hiddenGemCount = chosen.filter((it) => it.object.hiddenGem).length;

  if (onlyFree) {
    notes.push(
      `Anggaran belum cukup untuk biaya dasar (makan, penginapan, transportasi) sekitar ${formatRupiah(fixedTotal)}. Rencana ini hanya memuat tempat gratis.`,
    );
  } else if (trimmed) {
    notes.push("Beberapa tempat berbayar dikurangi agar sesuai anggaran.");
  }
  if (!onlyFree && hasBudget && total > input.budget!) {
    notes.push("Total masih melebihi anggaran karena biaya dasar sudah mendekati batas — pertimbangkan kamar lebih sedikit atau penginapan Hemat.");
  }

  const days_: PlanDay[] = Array.from({ length: days }, (_, d) => {
    const ms = startMs + d * DAY_MS;
    const items = chosen
      .filter((it) => it.dayIndex === d)
      .sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
    return { dayIndex: d, date: toIsoDay(ms), weekday: weekdayNames[new Date(ms).getUTCDay()], items };
  });
  for (const day of days_) {
    if (day.items.length === 0) {
      notes.push(`Hari ke-${day.dayIndex + 1} belum terisi — data budaya untuk pilihanmu masih terbatas. Coba tambah minat atau ubah kedalaman.`);
    }
  }

  // Calendar overlaps (exact dates win; otherwise a month hint is shown as "maybe").
  const endMs = startMs + (days - 1) * DAY_MS;
  const tripMonths = new Set<number>();
  for (let ms = startMs; ms <= endMs; ms += DAY_MS) tripMonths.add(new Date(ms).getUTCMonth() + 1);
  const scheduled = new Set(chosen.map((it) => it.object.slug));
  for (const ev of events) {
    if (scheduled.has(ev.slug) || (ev.objectSlug && scheduled.has(ev.objectSlug))) continue;
    const s = ev.startsOn ? new Date(ev.startsOn).getTime() : null;
    const e = ev.endsOn ? new Date(ev.endsOn).getTime() : s;
    if (s !== null && e !== null) {
      if (s <= endMs + DAY_MS - 1 && e >= startMs) notes.push(`Bertepatan dengan event: ${ev.title} (${ev.dateNote}).`);
    } else if (ev.monthHint && tripMonths.has(ev.monthHint)) {
      notes.push(`Mungkin ada: ${ev.title} — biasanya sekitar bulan ${monthNames[ev.monthHint - 1]}. Cek tanggal resmi sebelum berangkat.`);
    }
  }

  return {
    style,
    title: cfg.title,
    description: cfg.description,
    days: days_,
    costs,
    total,
    impactIdr,
    localShare,
    hiddenGemCount,
    itemCount: chosen.length,
    remaining,
    souvenirAllowance,
    notes,
  };
}

/** Public entry: returns the three plan variants for the given input. */
export function buildPlans(objects: PlannerObject[], events: PlannerEvent[], input: PlanInput): Plan[] {
  return (["SEIMBANG", "MENDALAM", "HEMAT"] as const).map((style) => buildPlan(style, objects, events, input));
}

/** Build one specific variant (used when saving a trip, so the saved plan equals the one shown). */
export function buildSinglePlan(style: PlanStyle, objects: PlannerObject[], events: PlannerEvent[], input: PlanInput): Plan {
  return buildPlan(style, objects, events, input);
}
