import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, firstIssue, readBody } from "@/lib/api";
import { resolveImageUrl } from "@/lib/images";
import { guardUmkm } from "@/lib/umkm-api";
import { umkmProductSchema } from "@/lib/validators";

/** Pelaku UMKM menambah produk. Tetap PENDING (tersembunyi dari galeri dan saran oleh-oleh) sampai kurator memverifikasi. */
export async function POST(req: Request) {
  const g = await guardUmkm();
  if (!g.ok) return g.error;

  const body = await readBody(req);
  if (body === null) return fail("Body tidak valid");
  const parsed = umkmProductSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;

  const imageUrl = await resolveImageUrl(g.user, d.imageUrl);
  if (imageUrl === false) return fail("Foto tidak valid, silakan unggah ulang");

  try {
    const created = await prisma.umkmProduct.create({
      data: {
        name: d.name,
        umkm: d.umkm,
        zone: d.zone,
        priceIdr: d.priceIdr,
        story: d.story,
        imageUrl: imageUrl ?? null,
        isActive: d.isActive,
        status: "PENDING",
        ownerId: g.user.id,
      },
      select: { id: true, status: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[umkm/products] create failed", error);
    return fail("Gagal menyimpan produk", 500);
  }
}
