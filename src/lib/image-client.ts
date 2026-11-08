// Dipakai di sisi browser: mengecilkan foto sebelum diunggah (maks. 1600 px sisi terpanjang, JPEG) agar cepat dan hemat database.

const MAX_SIDE = 1600;

/** Mengecilkan foto. Mengembalikan File JPEG, atau melempar galat berbahasa Indonesia. */
async function shrinkImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Format foto harus JPG, PNG, atau WebP");
  if (file.size > 15 * 1024 * 1024) throw new Error("Foto terlalu besar (maksimal 15 MB sebelum dikecilkan)");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Foto tidak bisa dibaca");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Peramban tidak mendukung pengolahan foto");
  ctx.fillStyle = "#fff"; // PNG transparan -> latar putih
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  for (const quality of [0.85, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= 1.8 * 1024 * 1024) return new File([blob], "foto.jpg", { type: "image/jpeg" });
  }
  throw new Error("Foto masih terlalu besar setelah dikecilkan. Pilih foto lain.");
}

/** Mengecilkan lalu mengunggah foto destinasi. Mengembalikan URL foto baru. */
export async function uploadObjectPhoto(objectId: string, file: File): Promise<string> {
  const small = await shrinkImage(file);
  const form = new FormData();
  form.append("file", small);
  const res = await fetch(`/api/pelaku/destinasi/${objectId}/foto`, { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Gagal mengunggah foto");
  return json.imageUrl as string;
}
