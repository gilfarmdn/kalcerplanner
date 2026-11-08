import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, firstIssue, readBody } from "@/lib/api";
import { findManageableObject, guardPelaku } from "@/lib/pelaku-api";
import { toDay } from "@/lib/tanggal";
import { visitCreateSchema } from "@/lib/pelaku-validators";

/** Pelaku mencatat kunjungan, mis. tamu yang datang langsung (walk-in). */
export async function POST(req: Request) {
  const g = await guardPelaku();
  if (!g.ok) return g.error;

  const body = await readBody(req);
  if (body === null) return fail("Body tidak valid");
  const parsed = visitCreateSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;

  const object = await findManageableObject(g.user, d.objectId);
  if (!object) return fail("Destinasi tidak ditemukan", 404);

  if (d.eventId) {
    const event = await prisma.culturalEvent.findFirst({ where: { id: d.eventId, objectId: object.id }, select: { id: true } });
    if (!event) return fail("Event tidak sesuai dengan destinasi", 400);
  }

  try {
    const created = await prisma.visit.create({
      data: {
        objectId: object.id,
        eventId: d.eventId ?? null,
        visitorName: d.visitorName,
        contact: d.contact ?? null,
        partySize: d.partySize,
        visitDate: toDay(d.visitDate),
        status: d.status,
        source: "WALKIN",
        note: d.note ?? null,
      },
      select: { id: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[pelaku/visits] create failed", error);
    return fail("Gagal menyimpan kunjungan", 500);
  }
}
