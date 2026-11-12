import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, firstIssue, readBody } from "@/lib/api";
import { resolveImageUrl } from "@/lib/images";
import { eventScheduleData, findManageableEvent, guardPelaku } from "@/lib/pelaku-api";
import { eventOccursOn } from "@/lib/kalender";
import { noticeVisits, toSchedule, upcomingVisits } from "@/lib/kuota";
import { eventProposalSchema } from "@/lib/validators";
import { dayString, formatHariPanjang } from "@/lib/tanggal";

/**
 * Ubah event mandiri milik sendiri. Perubahan mengembalikan status ke PENDING (dicek ulang kurator).
 * Pendaftar yang terdampak (jadwal bergeser / jam berubah) dikabari lewat email.
 */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const g = await guardPelaku();
  if (!g.ok) return g.error;

  const existing = await findManageableEvent(g.user, params.id);
  if (!existing) return fail("Event tidak ditemukan", 404);

  const body = await readBody(req);
  if (body === null) return fail("Body tidak valid");
  const parsed = eventProposalSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;

  const imageUrl = await resolveImageUrl(g.user, d.imageUrl);
  if (imageUrl === false) return fail("Foto tidak valid, silakan unggah ulang");

  try {
    const updated = await prisma.culturalEvent.update({
      where: { id: existing.id },
      data: {
        title: d.title,
        description: d.summary,
        interest: d.interest,
        zone: d.zone,
        ...(d.address !== undefined ? { address: d.address || null } : {}),
        lat: d.lat,
        lng: d.lng,
        meaning: d.meaning,
        etiquette: d.etiquette,
        priceIdr: d.priceIdr,
        childPriceIdr: d.childPriceIdr ?? null,
        openTime: d.openTime,
        closeTime: d.closeTime,
        scheduleNote: d.scheduleNote || null,
        ...(d.dailyQuota !== undefined ? { dailyQuota: d.dailyQuota } : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
        ...eventScheduleData(d),
        status: "PENDING",
        verifiedAt: null,
      },
    });

    const visits = await upcomingVisits({ eventId: existing.id });
    if (visits.length > 0) {
      const schedule = toSchedule(updated);
      const moved = visits.filter((v) => !eventOccursOn(schedule, dayString(v.visitDate)));
      for (const v of moved) {
        await noticeVisits(
          [v],
          `Jadwal event "${updated.title}" diubah pengelola: ${formatHariPanjang(v.visitDate)} tidak lagi termasuk jadwal (${updated.dateNote}). Silakan daftar ulang pada tanggal lain.`,
          true,
        );
      }
      if (existing.openTime !== d.openTime || existing.closeTime !== d.closeTime) {
        const rest = visits.filter((v) => !moved.includes(v));
        await noticeVisits(rest, `Jam acara "${updated.title}" diubah pengelola menjadi ${d.openTime}–${d.closeTime} WIB.`, false);
      }
    }
    return NextResponse.json({ ok: true, needsReview: true });
  } catch (error) {
    console.error("[pelaku/event-budaya] update failed", error);
    return fail("Gagal menyimpan perubahan", 500);
  }
}

/** Hapus event milik sendiri, kecuali sudah dipakai di rencana atau paspor pengunjung. Pendaftar dikabari. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const g = await guardPelaku();
  if (!g.ok) return g.error;

  const existing = await findManageableEvent(g.user, params.id);
  if (!existing) return fail("Event tidak ditemukan", 404);

  try {
    const [inTrips, stamps] = await Promise.all([
      prisma.tripItem.count({ where: { eventId: existing.id } }),
      prisma.stamp.count({ where: { eventId: existing.id } }),
    ]);
    if (inTrips + stamps > 0) {
      return fail("Event ini sudah dipakai di rencana atau paspor pengunjung, jadi tidak bisa dihapus. Nonaktifkan atau hubungi kurator bila perlu.", 409);
    }
    const visits = await upcomingVisits({ eventId: existing.id });
    await noticeVisits(visits, `Event "${existing.title}" dibatalkan oleh pengelola.`, true);
    // Kunjungan ke event mandiri tidak punya tujuan lain, jadi ikut dihapus (seperti kunjungan pada destinasi yang dihapus).
    await prisma.$transaction([
      prisma.visit.deleteMany({ where: { eventId: existing.id, objectId: null } }),
      prisma.culturalEvent.delete({ where: { id: existing.id } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[pelaku/event-budaya] delete failed", error);
    return fail("Gagal menghapus event", 500);
  }
}
