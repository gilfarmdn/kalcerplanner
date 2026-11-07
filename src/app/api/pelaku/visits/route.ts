import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { err, findManageableObject, firstIssueId, guardPelaku, readJson, toDay } from "@/lib/pelaku-api";
import { visitCreateSchema } from "@/lib/pelaku-validators";

/** Pelaku mencatat kunjungan, mis. tamu yang datang langsung (walk-in). */
export async function POST(req: Request) {
  const g = await guardPelaku();
  if (!g.ok) return g.error;

  const body = await readJson(req);
  if (body === null) return err("Body tidak valid");
  const parsed = visitCreateSchema.safeParse(body);
  if (!parsed.success) return err(firstIssueId(parsed.error));
  const d = parsed.data;

  const object = await findManageableObject(g.user, d.objectId);
  if (!object) return err("Destinasi tidak ditemukan", 404);

  if (d.eventId) {
    const event = await prisma.culturalEvent.findFirst({ where: { id: d.eventId, objectId: object.id }, select: { id: true } });
    if (!event) return err("Event tidak sesuai dengan destinasi", 400);
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
    return err("Gagal menyimpan kunjungan", 500);
  }
}
