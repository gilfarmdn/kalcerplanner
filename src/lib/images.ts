import { prisma } from "@/lib/prisma";

// Foto destinasi disimpan di ObjectImage; foto event dan foto profil di ImageAsset. Keduanya dirujuk lewat URL "/api/images/<id>".

export { MAX_IMAGE_BYTES } from "@/lib/image-rules";

const URL_PREFIX = "/api/images/";
const ID_RE = /^[a-z0-9]{10,40}$/;

export const imageUrlFor = (id: string) => `${URL_PREFIX}${id}`;

/** Id ImageAsset dari URL "/api/images/<id>", atau null bila URL bukan gambar unggahan. */
export function imageIdFromUrl(url: string | null | undefined): string | null {
  if (!url?.startsWith(URL_PREFIX)) return null;
  const id = url.slice(URL_PREFIX.length);
  return ID_RE.test(id) ? id : null;
}

export type ImageMime = "image/jpeg" | "image/png" | "image/webp";

/**
 * Tipe gambar dari magic bytes (tidak percaya pada nama file / Content-Type kiriman browser).
 * SVG sengaja tidak diterima karena bisa memuat skrip.
 */
export function sniffImageType(b: Uint8Array): ImageMime | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

/**
 * Nilai imageUrl yang boleh disimpan untuk user ini: undefined = tidak diubah, null = dihapus,
 * string = gambar unggahan milik user (kurator boleh memakai unggahan siapa pun). Lainnya -> false.
 */
export async function resolveImageUrl(
  user: { id: string; role: string },
  value: string | null | undefined,
): Promise<string | null | undefined | false> {
  if (value === undefined || value === null) return value;
  const id = imageIdFromUrl(value);
  if (!id) return false;
  const found = await prisma.imageAsset.findFirst({
    where: { id, ...(user.role === "ADMIN" ? {} : { uploaderId: user.id }) },
    select: { id: true },
  });
  return found ? imageUrlFor(found.id) : false;
}

