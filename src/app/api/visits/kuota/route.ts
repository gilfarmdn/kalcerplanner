import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { ACTIVE_VISIT, canCancel, filledOn, openOn } from "@/lib/kuota";
import { dayString, err, toDay } from "@/lib/pelaku-api";
import { prisma } from "@/lib/prisma";
import { hariIniJakarta } from "@/lib/tanggal";

/**
 * Sisa kuota sebuah tempat pada satu tanggal, plus pendaftaran milik pengguna: untuk tanggal itu bila ada,
 * kalau tidak pendaftaran terdekat yang akan datang (atau yang baru dibatalkan pengelola).
 */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return err("Silakan masuk terlebih dahulu", 401);

  const url = new URL(req.url);
  const objectId = url.searchParams.get("objectId") ?? "";
  const date = url.searchParams.get("date") ?? "";
  if (!objectId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return err("Parameter tidak valid");

  const object = await prisma.culturalObject.findFirst({
    where: { id: objectId, status: { in: ["VERIFIED", "SEED"] } },
    select: { id: true, isEvent: true, weekdays: true, dailyQuota: true, events: { where: { isActive: true } } },
  });
  if (!object) return err("Destinasi tidak ditemukan", 404);

  const today = toDay(hariIniJakarta());
  const [filled, visits] = await Promise.all([
    object.dailyQuota === null ? 0 : filledOn(object.id, date),
    prisma.visit.findMany({
      where: {
        userId: user.id,
        objectId: object.id,
        visitDate: { gte: today },
        OR: [{ status: { in: [...ACTIVE_VISIT] } }, { changeNotice: { not: null } }],
      },
      orderBy: { visitDate: "asc" },
      select: { id: true, visitDate: true, partySize: true, status: true, changeNotice: true },
    }),
  ]);
  const visit = visits.find((v) => dayString(v.visitDate) === date) ?? visits.find((v) => v.status !== "CANCELLED") ?? visits[0] ?? null;

  return NextResponse.json({
    quota: object.dailyQuota,
    remaining: object.dailyQuota === null ? null : Math.max(0, object.dailyQuota - filled),
    open: openOn(object, date).open,
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
