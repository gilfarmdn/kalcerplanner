import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, firstIssue, readBody } from "@/lib/api";
import { resolveImageUrl } from "@/lib/images";
import { findOwnedProduct, guardUmkm } from "@/lib/umkm-api";
import { umkmProductSchema } from "@/lib/validators";

/**
 * Ubah produk milik sendiri. Perubahan data mengembalikan status ke PENDING (dicek ulang kurator);
 * hanya mengubah tampil / sembunyi (`isActive`) tidak perlu verifikasi ulang.
 */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const g = await guardUmkm();
  if (!g.ok) return g.error;

  const existing = await findOwnedProduct(g.user, params.id);
  if (!existing) return fail("Produk tidak ditemukan", 404);

  const body = await readBody(req);
  if (body === null) return fail("Body tidak valid");
  const parsed = umkmProductSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;

  const imageUrl = await resolveImageUrl(g.user, d.imageUrl);
  if (imageUrl === false) return fail("Foto tidak valid, silakan unggah ulang");

  const contentChanged =
    existing.name !== d.name ||
    existing.umkm !== d.umkm ||
    existing.zone !== d.zone ||
    existing.priceIdr !== d.priceIdr ||
    existing.story !== d.story ||
    (imageUrl !== undefined && imageUrl !== existing.imageUrl);

  try {
    await prisma.umkmProduct.update({
      where: { id: existing.id },
      data: {
        name: d.name,
        umkm: d.umkm,
        zone: d.zone,
        priceIdr: d.priceIdr,
        story: d.story,
        isActive: d.isActive,
        ...(imageUrl !== undefined ? { imageUrl } : {}),
        ...(contentChanged ? { status: "PENDING" as const, verifiedAt: null } : {}),
      },
    });
    return NextResponse.json({ ok: true, needsReview: contentChanged });
  } catch (error) {
    console.error("[umkm/products] update failed", error);
    return fail("Gagal menyimpan perubahan", 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const g = await guardUmkm();
  if (!g.ok) return g.error;

  const existing = await findOwnedProduct(g.user, params.id);
  if (!existing) return fail("Produk tidak ditemukan", 404);

  try {
    await prisma.umkmProduct.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[umkm/products] delete failed", error);
    return fail("Gagal menghapus produk", 500);
  }
}
