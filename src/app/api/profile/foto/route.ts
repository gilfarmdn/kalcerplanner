import { NextResponse } from "next/server";
import { fail, guard } from "@/lib/api";
import { MAX_IMAGE_BYTES, imageIdFromUrl, imageUrlFor, sniffImageType } from "@/lib/images";
import { prisma } from "@/lib/prisma";

/** Hapus foto profil lama (hanya unggahan milik user itu sendiri). Tidak pernah melempar galat. */
async function removeOld(userId: string, url: string | null) {
  const id = imageIdFromUrl(url);
  if (!id) return;
  await prisma.imageAsset.deleteMany({ where: { id, uploaderId: userId } }).catch((error) => console.error("[profile/foto] cleanup failed", error));
}

/** Ganti foto profil (multipart, field "file"). Mengembalikan URL foto baru. */
export async function POST(req: Request) {
  const g = await guard();
  if (!g.ok) return g.error;

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return fail("Body tidak valid");
  }
  if (!file || typeof file === "string") return fail("Pilih file foto");
  if (file.size === 0) return fail("File kosong");
  if (file.size > MAX_IMAGE_BYTES) return fail("Ukuran foto maksimal 2 MB");

  const data = Buffer.from(await file.arrayBuffer());
  const mimeType = sniffImageType(data);
  if (!mimeType) return fail("Format foto harus JPG, PNG, atau WebP");

  try {
    const url = await prisma.$transaction(async (tx) => {
      const image = await tx.imageAsset.create({ data: { mimeType, size: data.length, data, uploaderId: g.user.id }, select: { id: true } });
      const url = imageUrlFor(image.id);
      await tx.user.update({ where: { id: g.user.id }, data: { avatarUrl: url } });
      return url;
    });
    await removeOld(g.user.id, g.user.avatarUrl);
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    console.error("[profile/foto] upload failed", error);
    return fail("Gagal menyimpan foto", 500);
  }
}

/** Hapus foto profil (kembali ke avatar bawaan). */
export async function DELETE() {
  const g = await guard();
  if (!g.ok) return g.error;

  try {
    await prisma.user.update({ where: { id: g.user.id }, data: { avatarUrl: null } });
    await removeOld(g.user.id, g.user.avatarUrl);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[profile/foto] delete failed", error);
    return fail("Gagal menghapus foto", 500);
  }
}
