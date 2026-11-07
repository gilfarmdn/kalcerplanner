import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { canCancel } from "@/lib/kuota";
import { dayString, err } from "@/lib/pelaku-api";
import { prisma } from "@/lib/prisma";

/** Pengguna membatalkan pendaftarannya sendiri (paling lambat H-1). Kuota otomatis kembali. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return err("Silakan masuk terlebih dahulu", 401);

  const visit = await prisma.visit.findFirst({ where: { id: params.id, userId: user.id }, select: { id: true, status: true, visitDate: true } });
  if (!visit) return err("Pendaftaran tidak ditemukan", 404);
  if (visit.status !== "BOOKED") return err("Pendaftaran ini tidak bisa dibatalkan");
  if (!canCancel(dayString(visit.visitDate))) return err("Pembatalan paling lambat H-1 sebelum tanggal kunjungan");

  try {
    await prisma.visit.update({ where: { id: visit.id }, data: { status: "CANCELLED", changeNotice: null, changedAt: null } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[visits] cancel failed", error);
    return err("Gagal membatalkan pendaftaran", 500);
  }
}
