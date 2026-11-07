import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { err, findManageableObject, firstIssueId, guardPelaku, ownedObjectWhere, readJson } from "@/lib/pelaku-api";
import { eventSchema } from "@/lib/pelaku-validators";
import { eventScheduleData } from "@/lib/pelaku-api";
import { eventOccursOn } from "@/lib/kalender";
import { noticeVisits, toSchedule, upcomingVisits } from "@/lib/kuota";
import { dayString } from "@/lib/pelaku-api";
import { formatHariPanjang } from "@/lib/tanggal";

/** Event hanya boleh diubah bila destinasi terkait milik user (atau user adalah kurator). */
const findEvent = (user: Parameters<typeof ownedObjectWhere>[0], id: string) =>
  prisma.culturalEvent.findFirst({ where: { id, object: ownedObjectWhere(user) }, select: { id: true } });

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const g = await guardPelaku();
  if (!g.ok) return g.error;

  const existing = await findEvent(g.user, params.id);
  if (!existing) return err("Event tidak ditemukan", 404);

  const body = await readJson(req);
  if (body === null) return err("Body tidak valid");
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return err(firstIssueId(parsed.error));
  const d = parsed.data;

  const object = await findManageableObject(g.user, d.objectId);
  if (!object) return err("Destinasi tidak ditemukan", 404);

  try {
    const updated = await prisma.culturalEvent.update({
      where: { id: existing.id },
      data: {
        title: d.title,
        description: d.description,
        interest: object.interest,
        zone: object.zone,
        objectId: object.id,
        ...eventScheduleData(d),
        venue: d.venue ?? null,
        isActive: d.isActive,
      },
    });

    // Pendaftar yang terdampak: event dinonaktifkan, atau tanggal kunjungannya tidak lagi termasuk jadwal baru.
    const visits = await upcomingVisits({ eventId: existing.id });
    if (!updated.isActive) {
      await noticeVisits(visits, `Event "${updated.title}" dibatalkan oleh pengelola.`, true);
    } else {
      const schedule = toSchedule(updated);
      const moved = visits.filter((v) => !eventOccursOn(schedule, dayString(v.visitDate)));
      for (const v of moved) {
        await noticeVisits(
          [v],
          `Jadwal event "${updated.title}" diubah pengelola: ${formatHariPanjang(v.visitDate)} tidak lagi termasuk jadwal (${updated.dateNote}). Silakan daftar ulang pada tanggal lain.`,
          true,
        );
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[pelaku/events] update failed", error);
    return err("Gagal menyimpan event", 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const g = await guardPelaku();
  if (!g.ok) return g.error;

  const existing = await findEvent(g.user, params.id);
  if (!existing) return err("Event tidak ditemukan", 404);

  try {
    const visits = await upcomingVisits({ eventId: existing.id });
    const event = await prisma.culturalEvent.findUnique({ where: { id: existing.id }, select: { title: true } });
    await noticeVisits(visits, `Event "${event?.title ?? ""}" dibatalkan oleh pengelola.`, true);
    await prisma.culturalEvent.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[pelaku/events] delete failed", error);
    return err("Gagal menghapus event", 500);
  }
}
