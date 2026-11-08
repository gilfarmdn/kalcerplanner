import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { KuotaError, openOn, registerVisit } from "@/lib/kuota";
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
    const object = await prisma.culturalObject.findFirst({
      where: { id: d.objectId, status: { in: ["VERIFIED", "SEED"] } },
      select: { id: true, isEvent: true, weekdays: true, dailyQuota: true, events: { where: { isActive: true } } },
    });
    if (!object) return fail("Destinasi tidak ditemukan", 404);
    if (object.dailyQuota === null) return fail("Tempat ini tidak memerlukan pendaftaran");

    const { open, eventId } = openOn(object, d.visitDate);
    if (!open) return fail(object.isEvent ? "Event tidak berlangsung pada tanggal ini" : "Tempat ini tutup pada hari tersebut");
    if (d.eventId && !object.events.some((e) => e.id === d.eventId)) return fail("Event tidak sesuai dengan destinasi");

    const created = await registerVisit({
      user,
      objectId: object.id,
      date: d.visitDate,
      partySize: d.partySize,
      eventId: eventId ?? d.eventId ?? null,
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
