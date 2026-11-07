import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { KuotaError, openOn, registerVisit } from "@/lib/kuota";
import { prisma } from "@/lib/prisma";
import { err, firstIssueId, readJson } from "@/lib/pelaku-api";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { hariIniJakarta } from "@/lib/tanggal";
import { publicVisitSchema } from "@/lib/pelaku-validators";

/** Wisatawan mendaftarkan kunjungan ke tempat yang memakai kuota (hanya yang sudah tampil publik). */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return err("Silakan masuk terlebih dahulu", 401);
  if (!rateLimit(`visit:${user.id}:${clientKey(req)}`, 40, 60 * 60_000)) return err("Terlalu banyak pendaftaran. Coba lagi nanti.", 429);

  const body = await readJson(req);
  if (body === null) return err("Body tidak valid");
  const parsed = publicVisitSchema.safeParse(body);
  if (!parsed.success) return err(firstIssueId(parsed.error));
  const d = parsed.data;

  if (d.visitDate < hariIniJakarta()) return err("Tanggal kunjungan tidak boleh di masa lalu");

  try {
    const object = await prisma.culturalObject.findFirst({
      where: { id: d.objectId, status: { in: ["VERIFIED", "SEED"] } },
      select: { id: true, isEvent: true, weekdays: true, dailyQuota: true, events: { where: { isActive: true } } },
    });
    if (!object) return err("Destinasi tidak ditemukan", 404);
    if (object.dailyQuota === null) return err("Tempat ini tidak memerlukan pendaftaran");

    const { open, eventId } = openOn(object, d.visitDate);
    if (!open) return err(object.isEvent ? "Event tidak berlangsung pada tanggal ini" : "Tempat ini tutup pada hari tersebut");
    if (d.eventId && !object.events.some((e) => e.id === d.eventId)) return err("Event tidak sesuai dengan destinasi");

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
    if (error instanceof KuotaError) return err(error.message, error.status);
    console.error("[visits] create failed", error);
    return err("Gagal mendaftarkan kunjungan", 500);
  }
}
