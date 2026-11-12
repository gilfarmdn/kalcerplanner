import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, firstIssue, readBody } from "@/lib/api";
import { findManageableObject, guardPelaku } from "@/lib/pelaku-api";
import { objectProposalSchema } from "@/lib/validators";
import { weekdayOf } from "@/lib/kalender";
import { noticeVisits, upcomingVisits } from "@/lib/kuota";
import { dayString, formatHariPanjang } from "@/lib/tanggal";

/**
 * Ubah destinasi milik sendiri. Perubahan mengembalikan status ke PENDING (dicek ulang kurator).
 */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const g = await guardPelaku();
  if (!g.ok) return g.error;

  const existing = await findManageableObject(g.user, params.id);
  if (!existing) return fail("Destinasi tidak ditemukan", 404);

  const body = await readBody(req);
  if (body === null) return fail("Body tidak valid");
  const parsed = objectProposalSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;

  const before = await prisma.culturalObject.findUnique({
    where: { id: existing.id },
    select: { name: true, openTime: true, closeTime: true, weekdays: true },
  });

  try {
    await prisma.culturalObject.update({
      where: { id: existing.id },
      data: {
        name: d.name,
        kind: d.kind,
        interest: d.interest,
        zone: d.zone,
        // Form tidak lagi memiliki kolom alamat: alamat lama dipertahankan kecuali dikirim eksplisit.
        ...(d.address !== undefined ? { address: d.address || null } : {}),
        lat: d.lat,
        lng: d.lng,
        summary: d.summary,
        meaning: d.meaning,
        etiquette: d.etiquette,
        priceIdr: d.priceIdr,
        childPriceIdr: d.childPriceIdr ?? null,
        durationMin: d.durationMin,
        depth: d.depth,
        slots: d.slots,
        weekdays: d.weekdays,
        openTime: d.openTime,
        closeTime: d.closeTime,
        scheduleNote: d.scheduleNote || null,
        ...(d.dailyQuota !== undefined ? { dailyQuota: d.dailyQuota } : {}),
        status: "PENDING",
        verifiedAt: null,
      },
    });

    // Kabari pendaftar bila hari buka atau jam berubah.
    if (before) {
      const visits = await upcomingVisits({ objectId: existing.id });
      const closed = visits.filter((v) => d.weekdays.length > 0 && !d.weekdays.includes(weekdayOf(dayString(v.visitDate))));
      for (const v of closed) {
        await noticeVisits([v], `${d.name} tidak lagi buka pada ${formatHariPanjang(v.visitDate)} (hari buka diubah pengelola). Silakan daftar ulang pada tanggal lain.`, true);
      }
      if (before.openTime !== d.openTime || before.closeTime !== d.closeTime) {
        const rest = visits.filter((v) => !closed.includes(v));
        await noticeVisits(rest, `Jam buka ${d.name} diubah pengelola menjadi ${d.openTime}–${d.closeTime} WIB.`, false);
      }
    }
    return NextResponse.json({ ok: true, needsReview: true });
  } catch (error) {
    console.error("[pelaku/destinasi] update failed", error);
    return fail("Gagal menyimpan perubahan", 500);
  }
}

/** Hapus destinasi milik sendiri, kecuali sudah dipakai di rencana atau paspor pengunjung. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const g = await guardPelaku();
  if (!g.ok) return g.error;

  const existing = await findManageableObject(g.user, params.id);
  if (!existing) return fail("Destinasi tidak ditemukan", 404);

  try {
    const [inTrips, stamps] = await Promise.all([
      prisma.tripItem.count({ where: { objectId: existing.id } }),
      prisma.stamp.count({ where: { objectId: existing.id } }),
    ]);
    if (inTrips + stamps > 0) {
      return fail("Destinasi ini sudah dipakai di rencana atau paspor pengunjung, jadi tidak bisa dihapus. Hubungi kurator bila perlu.", 409);
    }
    await prisma.culturalObject.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[pelaku/destinasi] delete failed", error);
    return fail("Gagal menghapus destinasi", 500);
  }
}
