"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadImage } from "@/lib/image-client";

const input = "w-full rounded-lg border border-[#2c2c2c] bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-brand-link";

export type ProductFormValues = {
  id: string;
  name: string;
  umkm: string;
  zone: string;
  priceIdr: number;
  story: string;
  imageUrl: string | null;
  isActive: boolean;
};

/**
 * Form produk UMKM. Tanpa `product` = menambah (POST /api/umkm/products); dengan `product` = mengubah.
 * Produk tampil di Galeri UMKM dan saran oleh-oleh setelah diverifikasi kurator.
 */
export default function ProductForm({
  product,
  defaultUmkm,
  zones,
}: {
  product?: ProductFormValues;
  /** Nama usaha awal (nama akun) untuk produk baru. */
  defaultUmkm?: string;
  /** Wilayah yang sudah dipakai objek / event / produk lain, sebagai pilihan (boleh mengetik wilayah baru). */
  zones: string[];
}) {
  const router = useRouter();
  const editing = !!product;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const photo = f.get("photo");
    const hasPhoto = photo instanceof File && photo.size > 0;
    if (!editing && !hasPhoto) {
      setMessage({ ok: false, text: "Pilih foto produk terlebih dahulu." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      // Foto diunggah lebih dulu; URL-nya ikut dikirim bersama data produk. Tanpa foto baru, foto lama dipertahankan.
      const imageUrl = hasPhoto ? await uploadImage(photo) : undefined;
      const res = await fetch(editing ? `/api/umkm/products/${product!.id}` : "/api/umkm/products", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          umkm: f.get("umkm"),
          zone: f.get("zone"),
          priceIdr: Number(f.get("priceIdr")),
          story: f.get("story"),
          isActive: f.get("isActive") === "on",
          imageUrl,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ ok: false, text: json.error ?? "Gagal menyimpan." });
        return;
      }
      if (editing) {
        setMessage({
          ok: true,
          text: json.needsReview
            ? "Perubahan tersimpan. Produk akan dicek ulang kurator sebelum tampil kembali."
            : "Perubahan tersimpan.",
        });
        router.refresh();
      } else {
        router.push("/produk");
        router.refresh();
      }
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Tidak dapat terhubung ke server." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-[10px] border border-neutral-300 bg-white p-5 sm:grid-cols-2">
      <label className="text-sm font-medium sm:col-span-2">
        Nama produk
        <input name="name" required minLength={3} maxLength={80} defaultValue={product?.name} className={`${input} mt-1`} />
      </label>

      <label className="text-sm font-medium">
        Nama usaha
        <input name="umkm" required minLength={2} maxLength={80} defaultValue={product?.umkm ?? defaultUmkm} className={`${input} mt-1`} />
      </label>

      <label className="text-sm font-medium">
        Wilayah (kabupaten / kota)
        <input name="zone" required minLength={2} maxLength={60} list="zone-options" defaultValue={product?.zone} className={`${input} mt-1`} />
        <datalist id="zone-options">
          {zones.map((z) => (
            <option key={z} value={z} />
          ))}
        </datalist>
        <span className="mt-1 block text-xs font-normal text-neutral-600">
          Saran oleh-oleh hanya muncul pada rencana yang tempat-tempatnya berada di wilayah ini, jadi tulis sama dengan nama wilayah di Jelajah.
        </span>
      </label>

      <label className="text-sm font-medium">
        Harga (Rp)
        <input name="priceIdr" type="number" required min={1000} max={50000000} step={500} defaultValue={product?.priceIdr} className={`${input} mt-1`} />
      </label>

      <label className="flex items-center gap-2 self-end text-sm font-medium">
        <input name="isActive" type="checkbox" defaultChecked={product?.isActive ?? true} />
        Tampilkan produk ini
      </label>

      <label className="text-sm font-medium sm:col-span-2">
        Cerita budaya di balik produk
        <textarea name="story" required minLength={20} maxLength={600} rows={4} defaultValue={product?.story} className={`${input} mt-1`} />
      </label>

      <label className="text-sm font-medium sm:col-span-2">
        {editing ? "Foto baru (opsional, kosongkan untuk mempertahankan foto lama)" : "Foto"}
        <input name="photo" type="file" required={!editing} accept="image/jpeg,image/png,image/webp" className={`${input} mt-1`} />
        <span className="mt-1 block text-xs font-normal text-neutral-600">JPG, PNG, atau WebP; otomatis dikecilkan.</span>
      </label>

      {message && (
        <p role={message.ok ? "status" : "alert"} className={`text-sm sm:col-span-2 ${message.ok ? "text-emerald-700" : "text-red-700"}`}>
          {message.text}
        </p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="h-10 rounded-lg bg-brand-green px-6 text-base font-medium text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Menyimpan..." : editing ? "Simpan perubahan" : "Ajukan untuk verifikasi"}
        </button>
      </div>
    </form>
  );
}
