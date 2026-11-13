import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, firstIssue, guard, readBody } from "@/lib/api";
import { verifySchema } from "@/lib/validators";

/** Kurator (ADMIN) memverifikasi atau menolak produk UMKM yang diajukan pelaku UMKM. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = await guard(["ADMIN"]);
  if (!g.ok) return g.error;

  const body = await readBody(req);
  if (body === null) return fail("Body tidak valid");
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  try {
    const result = await prisma.umkmProduct.updateMany({
      // Hanya produk yang diajukan pelaku UMKM; data awal (tanpa pemilik) tidak lewat kurasi.
      where: { id: params.id, ownerId: { not: null } },
      data: parsed.data.action === "VERIFY" ? { status: "VERIFIED", verifiedAt: new Date() } : { status: "REJECTED", verifiedAt: null },
    });
    if (result.count === 0) return fail("Data tidak ditemukan", 404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/umkm] verify failed", error);
    return fail("Gagal memperbarui status", 500);
  }
}
