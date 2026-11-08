import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { canCancel } from "@/lib/kuota";
import { dayString } from "@/lib/tanggal";
import { fail } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/** Pengguna membatalkan pendaftarannya sendiri (paling lambat H-1). Kuota otomatis kembali. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return fail("Silakan masuk terlebih dahulu", 401);

  const visit = await prisma.visit.findFirst({ where: { id: params.id, userId: user.id }, select: { id: true, status: true, visitDate: true } });
  if (!visit) return fail("Pendaftaran tidak ditemukan", 404);
  if (visit.status !== "BOOKED") return fail("Pendaftaran ini tidak bisa dibatalkan");
  if (!canCancel(dayString(visit.visitDate))) return fail("Pembatalan paling lambat H-1 sebelum tanggal kunjungan");

  try {
    await prisma.visit.update({ where: { id: visit.id }, data: { status: "CANCELLED", changeNotice: null, changedAt: null } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[visits] cancel failed", error);
    return fail("Gagal membatalkan pendaftaran", 500);
  }
}
