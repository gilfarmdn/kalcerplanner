// Satu bentuk tampilan untuk "tempat" pada rencana & paspor: destinasi (CulturalObject) atau event mandiri (CulturalEvent).

import type { Interest, ObjectKind } from "@/lib/culture";
import { EVENT_HREF } from "@/lib/culture-db";

type ObjectLike = {
  slug: string;
  name: string;
  kind: ObjectKind;
  interest: Interest;
  zone: string;
  imageUrl: string | null;
  meaning: string;
  etiquette: string[];
  scheduleNote: string | null;
  weekdays: number[];
  status: string;
  dailyQuota: number | null;
  openTime: string | null;
};

type EventLike = {
  slug: string;
  title: string;
  interest: Interest | null;
  zone: string | null;
  imageUrl: string | null;
  meaning: string | null;
  etiquette: string[];
  scheduleNote: string | null;
  status: string;
  dailyQuota: number | null;
  openTime: string | null;
};

export type Place = {
  isEvent: boolean;
  name: string;
  slug: string;
  href: string;
  /** Label jenis untuk ditampilkan ("Situs", "Event budaya", ...). */
  kind: ObjectKind | "EVENT";
  interest: Interest | null;
  zone: string;
  imageUrl: string | null;
  meaning: string;
  etiquette: string[];
  scheduleNote: string | null;
  /** Hari buka destinasi; event tidak memakai ini. */
  weekdays: number[];
  status: string;
  dailyQuota: number | null;
  openTime: string | null;
};

/** Tempat dari baris TripItem / Stamp / Visit yang memuat `object` atau `event`. */
export function placeOf(row: { object: ObjectLike | null; event: EventLike | null }): Place {
  if (row.object) {
    const o = row.object;
    return {
      isEvent: false,
      name: o.name,
      slug: o.slug,
      href: `/jelajah/${o.slug}`,
      kind: o.kind,
      interest: o.interest,
      zone: o.zone,
      imageUrl: o.imageUrl,
      meaning: o.meaning,
      etiquette: o.etiquette,
      scheduleNote: o.scheduleNote,
      weekdays: o.weekdays,
      status: o.status,
      dailyQuota: o.dailyQuota,
      openTime: o.openTime,
    };
  }
  const e = row.event;
  if (!e) throw new Error("Baris tidak punya destinasi maupun event");
  return {
    isEvent: true,
    name: e.title,
    slug: e.slug,
    href: EVENT_HREF(e.slug),
    kind: "EVENT",
    interest: e.interest,
    zone: e.zone ?? "",
    imageUrl: e.imageUrl,
    meaning: e.meaning ?? "",
    etiquette: e.etiquette,
    scheduleNote: e.scheduleNote,
    weekdays: [],
    status: e.status,
    dailyQuota: e.dailyQuota,
    openTime: e.openTime,
  };
}

export const placeKindLabel = (kind: Place["kind"], labels: Record<ObjectKind, string>) => (kind === "EVENT" ? "Event budaya" : labels[kind]);

/** Kunci unik tempat di daftar (id destinasi atau id event). */
export const placeKey = (row: { objectId: string | null; eventId: string | null }) => (row.objectId ?? row.eventId)!;
