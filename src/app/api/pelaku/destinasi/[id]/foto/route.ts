import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MAX_IMAGE_BYTES, sniffImageType } from "@/lib/images";
import { fail } from "@/lib/api";
import { findManageableObject, guardPelaku } from "@/lib/pelaku-api";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const IMAGE_URL_PREFIX = "/api/images/";

/** Unggah atau ganti foto destinasi milik sendiri (multipart, field "file"). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const g = await guardPelaku();
  if (!g.ok) return g.error;
  if (!rateLimit(`foto:${g.user.id}:${clientKey(req)}`, 30, 60 * 60_000)) return fail("Terlalu banyak unggahan. Coba lagi nanti.", 429);

  const object = await findManageableObject(g.user, params.id);
  if (!object) return fail("Destinasi tidak ditemukan", 404);

  // Tolak lebih awal bila badan permintaan jelas terlalu besar (sebelum dibaca ke memori).
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_IMAGE_BYTES + 64 * 1024) return fail("Foto terlalu besar (maksimal 2 MB)", 413);

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return fail("Berkas tidak valid");
  }
  if (!file || typeof file === "string") return fail("Pilih foto terlebih dahulu");
  if (file.size === 0) return fail("Berkas kosong");
  if (file.size > MAX_IMAGE_BYTES) return fail("Foto terlalu besar (maksimal 2 MB)", 413);

  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = sniffImageType(bytes);
  if (!mime) return fail("Format foto harus JPG, PNG, atau WebP");

  try {
    const url = await prisma.$transaction(async (tx) => {
      await tx.objectImage.deleteMany({ where: { objectId: object.id } });
      const created = await tx.objectImage.create({
        data: { objectId: object.id, mime, data: bytes, size: bytes.length },
        select: { id: true },
      });
      const imageUrl = `${IMAGE_URL_PREFIX}${created.id}`;
      await tx.culturalObject.update({ where: { id: object.id }, data: { imageUrl } });
      return imageUrl;
    });
    return NextResponse.json({ ok: true, imageUrl: url }, { status: 201 });
  } catch (error) {
    console.error("[pelaku/foto] upload failed", error);
    return fail("Gagal menyimpan foto", 500);
  }
}

/** Hapus foto unggahan; destinasi kembali memakai gambar bawaan. Foto dari sumber lain (bukan unggahan) tidak disentuh. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const g = await guardPelaku();
  if (!g.ok) return g.error;

  const object = await findManageableObject(g.user, params.id);
  if (!object) return fail("Destinasi tidak ditemukan", 404);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.objectImage.deleteMany({ where: { objectId: object.id } });
      if (object.imageUrl?.startsWith(IMAGE_URL_PREFIX)) {
        await tx.culturalObject.update({ where: { id: object.id }, data: { imageUrl: null } });
      }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[pelaku/foto] delete failed", error);
    return fail("Gagal menghapus foto", 500);
  }
}
