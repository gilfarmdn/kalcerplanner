import { prisma } from "@/lib/prisma";
import type { PlannerEvent, PlannerObject } from "@/lib/planner";

/** Objects the engine may recommend: curated team data (SEED) and curator-verified submissions. */
export const VISIBLE_STATUSES = ["SEED", "VERIFIED"] as const;

export const visibleEvent = {
  OR: [{ objectId: null }, { object: { status: { in: [...VISIBLE_STATUSES] } } }],
};

const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export async function getPlannerObjects(): Promise<PlannerObject[]> {
  const rows = await prisma.culturalObject.findMany({
    where: { status: { in: [...VISIBLE_STATUSES] } },
    orderBy: { name: "asc" },
    include: {
      events: {
        where: { isActive: true },
        select: { startsOn: true, endsOn: true, repeatsYearly: true, weekdays: true, exceptDates: true },
      },
    },
  });
  return rows.map((o) => ({
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
    isEvent: o.isEvent,
    dailyQuota: o.dailyQuota,
    openTime: o.openTime,
    closeTime: o.closeTime,
    // Objek event hanya boleh dijadwalkan pada tanggal event-nya berlangsung.
    schedules: o.isEvent
      ? o.events.map((e) => ({
          startsOn: ymd(e.startsOn),
          endsOn: ymd(e.endsOn),
          repeatsYearly: e.repeatsYearly,
          weekdays: e.weekdays,
          exceptDates: e.exceptDates,
        }))
      : [],
  }));
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
