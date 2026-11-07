"use client";

import { ChangeEvent, useRef, useState } from "react";
import { IMAGE_ACCEPT, MAX_IMAGE_BYTES } from "@/lib/image-rules";

/**
 * Pilih foto -> langsung diunggah ke /api/pelaku/images -> URL-nya dikembalikan lewat onChange.
 * Foto baru benar-benar terpasang setelah form induknya disimpan.
 */
export default function ImageUploadField({
  label,
  value,
  onChange,
  onBusyChange,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Ukuran foto maksimal 2 MB");
      return;
    }
    setUploading(true);
    onBusyChange?.(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/pelaku/images", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json.error ?? "Gagal mengunggah foto.");
      else onChange(json.url);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setUploading(false);
      onBusyChange?.(false);
    }
  }

  return (
    <div className="text-sm font-medium">
      <p>{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-4">
        <div className="flex h-28 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-neutral-400 bg-neutral-50">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Pratinjau foto" className="h-full w-full object-cover" />
          ) : (
            <span className="px-2 text-center text-xs font-normal text-neutral-500">Belum ada foto</span>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-[#2c2c2c] px-3 py-1.5 font-normal hover:bg-neutral-100 disabled:opacity-60"
            >
              {uploading ? "Mengunggah..." : value ? "Ganti foto" : "Pilih foto"}
            </button>
            {value && !uploading && (
              <button type="button" onClick={() => onChange(null)} className="font-normal text-red-700 underline">
                Hapus foto
              </button>
            )}
          </div>
          <p className="text-xs font-normal text-neutral-600">JPG, PNG, atau WebP, maks. 2 MB.</p>
          {error && <p role="alert" className="text-xs font-normal text-red-700">{error}</p>}
        </div>
      </div>
      <input ref={fileRef} type="file" accept={IMAGE_ACCEPT} onChange={onPick} className="hidden" />
    </div>
  );
}
