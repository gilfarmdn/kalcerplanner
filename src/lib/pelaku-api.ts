import { randomBytes } from "node:crypto";
import { guard } from "@/lib/api";
import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDay } from "@/lib/tanggal";

/** Hanya pelaku budaya. Kurator tidak menambah / mengubah data wisata, hanya memverifikasinya. */
export const guardPelaku = () => guard(["PRACTITIONER"]);

/** Where-clause yang membatasi data pada milik pelaku itu sendiri. */
export const ownedObjectWhere = (user: CurrentUser) => ({ ownerId: user.id });

/** Objek yang boleh dikelola user ini, atau null (tidak ada / bukan miliknya). */
export function findManageableObject(user: CurrentUser, id: string) {
  return prisma.culturalObject.findFirst({ where: { id, ...ownedObjectWhere(user) } });
}

export function eventScheduleData(d: {
  startsOn: string;
  endsOn?: string;
  recurrence: "ONCE" | "YEARLY" | "WEEKLY";
  weekdays: number[];
  exceptDates: string[];
}) {
  const weekly = d.recurrence === "WEEKLY";
  return {
    monthHint: Number(d.startsOn.slice(5, 7)),
    dateNote: weekly ? "Rutin mingguan" : d.recurrence === "YEARLY" ? "Berulang setiap tahun" : "Tanggal pasti",
    startsOn: toDay(d.startsOn),
    endsOn: weekly && !d.endsOn ? null : toDay(d.endsOn ?? d.startsOn),
    repeatsYearly: d.recurrence === "YEARLY",
    weekdays: weekly ? [...new Set(d.weekdays)].sort() : [],
    exceptDates: weekly ? [...new Set(d.exceptDates)].sort() : [],
  };
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "item";

export const uniqueSlug = (name: string) => `${slugify(name)}-${randomBytes(2).toString("hex")}`;
