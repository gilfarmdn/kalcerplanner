import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, guard } from "@/lib/api";
import { MAX_IMAGE_BYTES, imageUrlFor, sniffImageType } from "@/lib/images";

/** Unggah foto (multipart, field "file") untuk destinasi, event, atau produk UMKM. Mengembalikan URL yang lalu disimpan di imageUrl. */
export async function POST(req: Request) {
  // Foto event / destinasi (pelaku budaya) dan foto produk (pelaku UMKM).
  const g = await guard(["PRACTITIONER", "UMKM"]);
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
    const image = await prisma.imageAsset.create({
      data: { mimeType, size: data.length, data, uploaderId: g.user.id },
      select: { id: true },
    });
    return NextResponse.json({ url: imageUrlFor(image.id) }, { status: 201 });
  } catch (error) {
    console.error("[pelaku/images] upload failed", error);
    return fail("Gagal menyimpan foto", 500);
  }
}
