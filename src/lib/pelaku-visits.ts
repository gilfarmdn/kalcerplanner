import type { Prisma } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth";
import { ownedVisitWhere } from "@/lib/pelaku-api";
import { toDay } from "@/lib/tanggal";

export type VisitFilter = { from?: string; to?: string; objectId?: string; eventId?: string; status?: string; q?: string };

const isDay = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Filter kunjungan yang boleh dilihat user, dipakai bersama oleh halaman dan ekspor CSV. */
export function visitWhere(user: CurrentUser, f: VisitFilter): Prisma.VisitWhereInput {
  const dateRange: Prisma.DateTimeFilter = {};
  if (isDay(f.from)) dateRange.gte = toDay(f.from!);
  if (isDay(f.to)) dateRange.lte = toDay(f.to!);
  return {
    ...ownedVisitWhere(user),
    ...(f.objectId ? { objectId: f.objectId } : {}),
    ...(f.eventId ? { eventId: f.eventId } : {}),
    ...(Object.keys(dateRange).length ? { visitDate: dateRange } : {}),
    ...(f.status === "BOOKED" || f.status === "ATTENDED" || f.status === "CANCELLED" ? { status: f.status } : {}),
    ...(f.q?.trim()
      ? { AND: [{ OR: [{ visitorName: { contains: f.q.trim(), mode: "insensitive" } }, { contact: { contains: f.q.trim(), mode: "insensitive" } }] }] }
      : {}),
  };
}
