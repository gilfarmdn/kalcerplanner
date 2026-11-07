import type { Prisma } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth";
import { ownedObjectWhere, toDay } from "@/lib/pelaku-api";

export type VisitFilter = { from?: string; to?: string; objectId?: string; status?: string; q?: string };

const isDay = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Filter kunjungan yang boleh dilihat user, dipakai bersama oleh halaman dan ekspor CSV. */
export function visitWhere(user: CurrentUser, f: VisitFilter): Prisma.VisitWhereInput {
  const dateRange: Prisma.DateTimeFilter = {};
  if (isDay(f.from)) dateRange.gte = toDay(f.from!);
  if (isDay(f.to)) dateRange.lte = toDay(f.to!);
  return {
    object: ownedObjectWhere(user),
    ...(f.objectId ? { objectId: f.objectId } : {}),
    ...(Object.keys(dateRange).length ? { visitDate: dateRange } : {}),
    ...(f.status === "BOOKED" || f.status === "ATTENDED" || f.status === "CANCELLED" ? { status: f.status } : {}),
    ...(f.q?.trim()
      ? { OR: [{ visitorName: { contains: f.q.trim(), mode: "insensitive" } }, { contact: { contains: f.q.trim(), mode: "insensitive" } }] }
      : {}),
  };
}
