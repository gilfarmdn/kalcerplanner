import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, guard, readBody } from "@/lib/api";
import { noticeVisits, upcomingVisits } from "@/lib/kuota";
import { toDay } from "@/lib/pelaku-api";
import { prisma } from "@/lib/prisma";
import { hariIniJakarta } from "@/lib/tanggal";

const actionSchema = z.object({ action: z.enum(["DEACTIVATE", "ACTIVATE"]) });

/** Akun yang boleh dikelola kurator: pelaku budaya dan pengguna (bukan sesama kurator). */
const findManagedUser = (id: string) =>
  prisma.user.findFirst({ where: { id, role: { in: ["PRACTITIONER", "TRAVELER"] } }, select: { id: true, deactivatedAt: true } });

/** Kurator menonaktifkan (tidak bisa masuk) atau mengaktifkan kembali sebuah akun. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = await guard(["ADMIN"]);
  if (!g.ok) return g.error;

  const parsed = actionSchema.safeParse(await readBody(req));
  if (!parsed.success) return fail("Aksi tidak valid");

  const user = await findManagedUser(params.id);
  if (!user) return fail("Akun tidak ditemukan", 404);

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { deactivatedAt: parsed.data.action === "DEACTIVATE" ? new Date() : null },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/users] update failed", error);
    return fail("Gagal memperbarui akun", 500);
  }
}

/**
 * Hapus akun, hanya bila sudah dinonaktifkan. Rencana, stempel, dan token ikut terhapus; pendaftaran kunjungan
 * yang akan datang dibatalkan (kuota kembali). Destinasi milik pelaku disembunyikan (status HIDDEN) dan
 * pendaftar di destinasi itu dikabari.
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const g = await guard(["ADMIN"]);
  if (!g.ok) return g.error;

  const user = await findManagedUser(params.id);
  if (!user) return fail("Akun tidak ditemukan", 404);
  if (!user.deactivatedAt) return fail("Nonaktifkan akun terlebih dahulu sebelum menghapus", 409);

  try {
    const owned = await prisma.culturalObject.findMany({ where: { ownerId: user.id }, select: { id: true } });
    if (owned.length > 0) {
      const ids = owned.map((o) => o.id);
      await prisma.culturalObject.updateMany({ where: { id: { in: ids } }, data: { status: "HIDDEN", verifiedAt: null } });
      await noticeVisits(await upcomingVisits({ objectId: { in: ids } }), "Tempat ini tidak lagi tersedia di KalcerPlanner.", true);
    }

    await prisma.$transaction([
      prisma.visit.updateMany({
        where: { userId: user.id, status: "BOOKED", visitDate: { gte: toDay(hariIniJakarta()) } },
        data: { status: "CANCELLED" },
      }),
      prisma.user.delete({ where: { id: user.id } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/users] delete failed", error);
    return fail("Gagal menghapus akun", 500);
  }
}
