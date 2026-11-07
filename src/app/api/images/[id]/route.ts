import { prisma } from "@/lib/prisma";

/** Menyajikan foto dari database. ID unik per unggahan, jadi aman di-cache selamanya. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!/^[a-z0-9]{20,40}$/.test(params.id)) return new Response("Not found", { status: 404 });

  // Foto destinasi (ObjectImage), atau unggahan lain seperti foto event dan foto profil (ImageAsset).
  const row =
    (await prisma.objectImage.findUnique({ where: { id: params.id }, select: { mime: true, data: true } })) ??
    (await prisma.imageAsset.findUnique({ where: { id: params.id }, select: { mimeType: true, data: true } }).then((a) => a && { mime: a.mimeType, data: a.data }));
  if (!row) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.mime,
      "Content-Length": String(row.data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
