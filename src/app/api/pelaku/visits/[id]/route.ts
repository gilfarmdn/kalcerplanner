import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fail, firstIssue, readBody } from "@/lib/api";
import { guardPelaku, ownedObjectWhere } from "@/lib/pelaku-api";
import { toDay } from "@/lib/tanggal";
import { visitUpdateSchema } from "@/lib/pelaku-validators";
import { noticeVisits, upcomingVisits } from "@/lib/kuota";

const findVisit = (user: Parameters<typeof ownedObjectWhere>[0], id: string) =>
  prisma.visit.findFirst({ where: { id, object: ownedObjectWhere(user) }, select: { id: true, objectId: true, status: true, userId: true } });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = await guardPelaku();
  if (!g.ok) return g.error;

  const existing = await findVisit(g.user, params.id);
  if (!existing) return fail("Data kunjungan tidak ditemukan", 404);

  const body = await readBody(req);
  if (body === null) return fail("Body tidak valid");
  const parsed = visitUpdateSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;

  if (d.eventId) {
    const event = await prisma.culturalEvent.findFirst({ where: { id: d.eventId, objectId: existing.objectId }, select: { id: true } });
    if (!event) return fail("Event tidak sesuai dengan destinasi", 400);
  }

  try {
    // Pendaftaran online yang dibatalkan pengelola: kabari penggunanya.
    if (d.status === "CANCELLED" && existing.status === "BOOKED" && existing.userId) {
      await noticeVisits(await upcomingVisits({ id: existing.id }), "Pendaftaranmu dibatalkan oleh pengelola.", true);
    }
    await prisma.visit.update({
      where: { id: existing.id },
      data: {
        ...(d.visitorName !== undefined ? { visitorName: d.visitorName } : {}),
        ...(d.contact !== undefined ? { contact: d.contact || null } : {}),
        ...(d.partySize !== undefined ? { partySize: d.partySize } : {}),
        ...(d.visitDate !== undefined ? { visitDate: toDay(d.visitDate) } : {}),
        ...(d.note !== undefined ? { note: d.note || null } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.eventId !== undefined ? { eventId: d.eventId } : {}),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("Pengunjung ini sudah terdaftar pada tanggal tersebut", 409);
    }
    console.error("[pelaku/visits] update failed", error);
    return fail("Gagal memperbarui kunjungan", 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const g = await guardPelaku();
  if (!g.ok) return g.error;

  const existing = await findVisit(g.user, params.id);
  if (!existing) return fail("Data kunjungan tidak ditemukan", 404);

  try {
    await prisma.visit.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[pelaku/visits] delete failed", error);
    return fail("Gagal menghapus kunjungan", 500);
  }
}
