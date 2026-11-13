import { prisma } from "@/lib/prisma";
import type { UmkmProduct } from "@/lib/content";

/** Produk UMKM aktif dari database, siap dipakai Galeri UMKM dan saran oleh-oleh. */
export async function getUmkmProducts(): Promise<UmkmProduct[]> {
  const rows = await prisma.umkmProduct.findMany({ where: { isActive: true, status: { in: ["SEED", "VERIFIED"] } }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    umkm: r.umkm,
    zone: r.zone,
    price: r.priceIdr,
    // Tanpa foto: gambar bawaan yang dibangkitkan dari id (sama seperti destinasi tanpa foto).
    image: r.imageUrl ?? `/api/placeholder/${r.id}`,
    story: r.story,
  }));
}

/**
 * Wilayah yang sudah dipakai data lain (destinasi, event mandiri, produk UMKM), sebagai pilihan di formulir produk
 * supaya penulisannya sama dan saran oleh-oleh bisa dicocokkan dengan wilayah rencana.
 */
export async function knownZones(): Promise<string[]> {
  const [objects, events, products] = await Promise.all([
    prisma.culturalObject.findMany({ where: { status: { in: ["SEED", "VERIFIED"] } }, distinct: ["zone"], select: { zone: true } }),
    prisma.culturalEvent.findMany({ where: { status: { in: ["SEED", "VERIFIED"] }, zone: { not: null } }, distinct: ["zone"], select: { zone: true } }),
    prisma.umkmProduct.findMany({ distinct: ["zone"], select: { zone: true } }),
  ]);
  const all = [...objects.map((r) => r.zone), ...events.flatMap((r) => (r.zone ? [r.zone] : [])), ...products.map((r) => r.zone)];
  return [...new Set(all)].sort((a, b) => a.localeCompare(b, "id"));
}
