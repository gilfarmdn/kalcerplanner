import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { getUser, type CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Respons galat untuk API dasbor pelaku (bahasa Indonesia). */
export const err = (error: string, status = 400) => NextResponse.json({ error }, { status });
export const firstIssueId = (e: ZodError) => e.issues[0]?.message ?? "Input tidak valid";

export async function readJson(req: Request): Promise<unknown | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

type Guard = { ok: true; user: CurrentUser } | { ok: false; error: NextResponse };

/** Hanya pelaku budaya. Kurator tidak menambah / mengubah data wisata, hanya memverifikasinya. */
export async function guardPelaku(): Promise<Guard> {
  const user = await getUser();
  if (!user) return { ok: false, error: err("Silakan masuk terlebih dahulu", 401) };
  if (user.role !== "PRACTITIONER") return { ok: false, error: err("Akses hanya untuk pelaku budaya", 403) };
  return { ok: true, user };
}

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

/** 'YYYY-MM-DD' -> Date UTC tengah malam. */
export const toDay = (s: string) => new Date(`${s}T00:00:00.000Z`);
export const dayString = (d: Date) => d.toISOString().slice(0, 10);
