import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { ACTIVE_VISIT, canCancel, eventOpenOn, filledOn, objectOpenOn, type VisitTarget } from "@/lib/kuota";
import { VISIBLE_STATUSES, visibleEvent } from "@/lib/culture-db";
import { dayString, toDay, hariIniJakarta } from "@/lib/tanggal";
import { fail } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * Sisa kuota sebuah tempat (destinasi `objectId` atau event mandiri `eventId`) pada satu tanggal, plus pendaftaran
 * milik pengguna: untuk tanggal itu bila ada, kalau tidak pendaftaran terdekat yang akan datang
 * (atau yang baru dibatalkan pengelola).
 */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Silakan masuk terlebih dahulu", 401);

  const url = new URL(req.url);
  const objectId = url.searchParams.get("objectId") ?? "";
  const eventId = url.searchParams.get("eventId") ?? "";
  const date = url.searchParams.get("date") ?? "";
  if ((!objectId && !eventId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Parameter tidak valid");

  let target: VisitTarget;
  let quota: number | null;
  let open: boolean;
  if (objectId) {
    const object = await prisma.culturalObject.findFirst({
      where: { id: objectId, status: { in: [...VISIBLE_STATUSES] } },
      select: { id: true, weekdays: true, dailyQuota: true },
    });
    if (!object) return fail("Destinasi tidak ditemukan", 404);
    target = { objectId: object.id };
    quota = object.dailyQuota;
    open = objectOpenOn(object, date);
  } else {
    const event = await prisma.culturalEvent.findFirst({
      where: { id: eventId, isActive: true, objectId: null, ...visibleEvent },
      select: { id: true, dailyQuota: true, startsOn: true, endsOn: true, repeatsYearly: true, weekdays: true, exceptDates: true },
    });
    if (!event) return fail("Event tidak ditemukan", 404);
    target = { eventId: event.id };
    quota = event.dailyQuota;
    open = eventOpenOn(event, date);
  }

  const today = toDay(hariIniJakarta());
  const [filled, visits] = await Promise.all([
    quota === null ? 0 : filledOn(target, date),
    prisma.visit.findMany({
      where: {
        userId: user.id,
        ...(target.objectId ? { objectId: target.objectId } : { eventId: target.eventId }),
        visitDate: { gte: today },
        OR: [{ status: { in: [...ACTIVE_VISIT] } }, { changeNotice: { not: null } }],
      },
      orderBy: { visitDate: "asc" },
      select: { id: true, visitDate: true, partySize: true, status: true, changeNotice: true },
    }),
  ]);
  const visit = visits.find((v) => dayString(v.visitDate) === date) ?? visits.find((v) => v.status !== "CANCELLED") ?? visits[0] ?? null;

  return NextResponse.json({
    quota,
    remaining: quota === null ? null : Math.max(0, quota - filled),
    open,
    visit: visit && {
      id: visit.id,
      date: dayString(visit.visitDate),
      partySize: visit.partySize,
      status: visit.status,
      changeNotice: visit.changeNotice,
      canCancel: visit.status === "BOOKED" && canCancel(dayString(visit.visitDate)),
    },
  });
}
