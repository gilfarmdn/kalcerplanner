import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { KuotaError, eventOpenOn, objectOpenOn, registerVisit, type VisitTarget } from "@/lib/kuota";
import { VISIBLE_STATUSES, visibleEvent } from "@/lib/culture-db";
import { prisma } from "@/lib/prisma";
import { fail, firstIssue, readBody } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { hariIniJakarta } from "@/lib/tanggal";
import { publicVisitSchema } from "@/lib/pelaku-validators";

/** Wisatawan mendaftarkan kunjungan ke tempat yang memakai kuota (hanya yang sudah tampil publik). */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return fail("Silakan masuk terlebih dahulu", 401);
  if (!rateLimit(`visit:${user.id}:${clientKey(req)}`, 40, 60 * 60_000)) return fail("Terlalu banyak pendaftaran. Coba lagi nanti.", 429);

  const body = await readBody(req);
  if (body === null) return fail("Body tidak valid");
  const parsed = publicVisitSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;

  if (d.visitDate < hariIniJakarta()) return fail("Tanggal kunjungan tidak boleh di masa lalu");

  try {
    let target: VisitTarget;
    if (d.objectId) {
      // Destinasi: hari buka. `eventId` (opsional) menandai kegiatan pada destinasi itu.
      const object = await prisma.culturalObject.findFirst({
        where: { id: d.objectId, status: { in: [...VISIBLE_STATUSES] } },
        select: { id: true, weekdays: true, dailyQuota: true, events: { where: { isActive: true }, select: { id: true } } },
      });
      if (!object) return fail("Destinasi tidak ditemukan", 404);
      if (object.dailyQuota === null) return fail("Tempat ini tidak memerlukan pendaftaran");
      if (!objectOpenOn(object, d.visitDate)) return fail("Tempat ini tutup pada hari tersebut");
      if (d.eventId && !object.events.some((e) => e.id === d.eventId)) return fail("Event tidak sesuai dengan destinasi");
      target = { objectId: object.id, eventId: d.eventId ?? null };
    } else {
      // Event mandiri: tanggalnya harus termasuk jadwal event.
      const event = await prisma.culturalEvent.findFirst({
        where: { id: d.eventId!, isActive: true, objectId: null, ...visibleEvent },
        select: { id: true, dailyQuota: true, startsOn: true, endsOn: true, repeatsYearly: true, weekdays: true, exceptDates: true },
      });
      if (!event) return fail("Event tidak ditemukan", 404);
      if (event.dailyQuota === null) return fail("Event ini tidak memerlukan pendaftaran");
      if (!eventOpenOn(event, d.visitDate)) return fail("Event tidak berlangsung pada tanggal ini");
      target = { eventId: event.id };
    }

    const created = await registerVisit({
      user,
      target,
      date: d.visitDate,
      partySize: d.partySize,
      contact: d.contact,
      note: d.note,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof KuotaError) return fail(error.message, error.status);
    console.error("[visits] create failed", error);
    return fail("Gagal mendaftarkan kunjungan", 500);
  }
}
