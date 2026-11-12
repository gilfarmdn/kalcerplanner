import { prisma } from "@/lib/prisma";
import type { PlannerEvent, PlannerObject } from "@/lib/planner";

/** Objects the engine may recommend: curated team data (SEED) and curator-verified submissions. */
export const VISIBLE_STATUSES = ["SEED", "VERIFIED"] as const;

/** Event yang boleh tampil publik: statusnya tampil, dan destinasi induknya (bila ada) juga tampil. */
export const visibleEvent = {
  status: { in: [...VISIBLE_STATUSES] },
  OR: [{ objectId: null }, { object: { status: { in: [...VISIBLE_STATUSES] } } }],
};

/**
 * Event mandiri yang bisa masuk rencana & Jelajah: diajukan pelaku (tanpa destinasi induk), punya lokasi, tema, dan tanggal.
 * Catatan kalender (data seed / kegiatan pada destinasi) tidak termasuk.
 */
export const plannableEvent = {
  isActive: true,
  objectId: null,
  ...visibleEvent,
  lat: { not: null },
  lng: { not: null },
  interest: { not: null },
  startsOn: { not: null },
};

export const EVENT_HREF = (slug: string) => `/jelajah/event/${slug}`;

const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

type PlannableEventRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  interest: PlannerObject["interest"] | null;
  zone: string | null;
  lat: number | null;
  lng: number | null;
  meaning: string | null;
  etiquette: string[];
  priceIdr: number;
  childPriceIdr: number | null;
  openTime: string | null;
  closeTime: string | null;
  scheduleNote: string | null;
  dailyQuota: number | null;
  localRun: boolean;
  hiddenGem: boolean;
  status: string;
  imageUrl: string | null;
  startsOn: Date | null;
  endsOn: Date | null;
  repeatsYearly: boolean;
  weekdays: number[];
  exceptDates: string[];
};

/** Event mandiri -> bentuk yang dipahami mesin rencana. Jam acara menentukan lama dan slot waktunya. */
function eventToPlannerObject(e: PlannableEventRow): PlannerObject {
  const open = e.openTime ?? "08:00";
  const close = e.closeTime ?? "16:00";
  const minutes = Math.min(480, Math.max(15, toMin(close) - toMin(open)));
  return {
    id: e.id,
    slug: e.slug,
    name: e.title,
    kind: "PERTUNJUKAN",
    interest: e.interest!,
    alsoInterests: [],
    zone: e.zone ?? "",
    lat: e.lat!,
    lng: e.lng!,
    summary: e.description,
    meaning: e.meaning ?? "",
    etiquette: e.etiquette,
    priceIdr: e.priceIdr,
    childPriceIdr: e.childPriceIdr,
    durationMin: minutes,
    depth: "LIHAT",
    slots: [],
    weekdays: [],
    scheduleNote: e.scheduleNote,
    localRun: e.localRun,
    hiddenGem: e.hiddenGem,
    status: e.status,
    imageUrl: e.imageUrl,
    isEvent: true,
    dailyQuota: e.dailyQuota,
    openTime: e.openTime,
    closeTime: e.closeTime,
    // Event hanya boleh dijadwalkan pada tanggal event-nya berlangsung.
    schedules: [
      {
        startsOn: ymd(e.startsOn),
        endsOn: ymd(e.endsOn),
        repeatsYearly: e.repeatsYearly,
        weekdays: e.weekdays,
        exceptDates: e.exceptDates,
      },
    ],
  };
}

/** Destinasi (CulturalObject) ditambah event mandiri (CulturalEvent) yang boleh direkomendasikan. */
export async function getPlannerObjects(): Promise<PlannerObject[]> {
  const [rows, eventRows] = await Promise.all([
    prisma.culturalObject.findMany({
      where: { status: { in: [...VISIBLE_STATUSES] } },
      orderBy: { name: "asc" },
    }),
    prisma.culturalEvent.findMany({ where: plannableEvent, orderBy: { title: "asc" } }),
  ]);
  const objects: PlannerObject[] = rows.map((o) => ({
    id: o.id,
    slug: o.slug,
    name: o.name,
    kind: o.kind,
    interest: o.interest,
    alsoInterests: o.alsoInterests,
    zone: o.zone,
    lat: o.lat,
    lng: o.lng,
    summary: o.summary,
    meaning: o.meaning,
    etiquette: o.etiquette,
    priceIdr: o.priceIdr,
    childPriceIdr: o.childPriceIdr,
    durationMin: o.durationMin,
    depth: o.depth,
    slots: o.slots,
    weekdays: o.weekdays,
    scheduleNote: o.scheduleNote,
    localRun: o.localRun,
    hiddenGem: o.hiddenGem,
    status: o.status,
    imageUrl: o.imageUrl,
    isEvent: false,
    dailyQuota: o.dailyQuota,
    openTime: o.openTime,
    closeTime: o.closeTime,
    schedules: [],
  }));
  return [...objects, ...eventRows.map(eventToPlannerObject)];
}

export async function getPlannerEvents(): Promise<PlannerEvent[]> {
  const rows = await prisma.culturalEvent.findMany({
    where: { isActive: true, ...visibleEvent },
    include: { object: { select: { slug: true } } },
  });
  return rows.filter((e) => e.weekdays.length === 0).map((e) => ({
    slug: e.slug,
    title: e.title,
    objectSlug: e.object?.slug ?? null,
    // Event tahunan: tahun pada tanggalnya hanya acuan, jadi mesin memakai petunjuk bulan (tanpa tanggal pasti).
    monthHint: e.monthHint ?? (e.repeatsYearly && e.startsOn ? e.startsOn.getUTCMonth() + 1 : null),
    dateNote: e.dateNote,
    startsOn: e.repeatsYearly ? null : e.startsOn,
    endsOn: e.repeatsYearly ? null : e.endsOn,
  }));
}

/** Image for a cultural object: its own upload/URL, or a generated placeholder you can replace later. */
export const objectImage = (o: { slug: string; imageUrl: string | null }) => o.imageUrl ?? `/api/placeholder/${o.slug}`;
