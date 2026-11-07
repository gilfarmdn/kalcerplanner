"use client";

import { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadObjectPhoto } from "@/lib/image-client";

/** Foto destinasi: lihat, ganti, hapus. Foto disimpan di database dan tampil di /jelajah. */
export default function PhotoUploader({ objectId, imageUrl, fallbackUrl }: { objectId: string; imageUrl: string | null; fallbackUrl: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const isUploaded = !!imageUrl?.startsWith("/api/images/");

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      await uploadObjectPhoto(objectId, file);
      setMessage({ ok: true, text: "Foto tersimpan." });
      router.refresh();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Gagal mengunggah foto" });
    } finally {
      setBusy(false);
      input.value = "";
    }
  }

  async function remove() {
    if (!window.confirm("Hapus foto ini? Destinasi akan memakai gambar bawaan.")) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/pelaku/destinasi/${objectId}/foto`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setMessage({ ok: false, text: json.error ?? "Gagal menghapus foto" });
      else {
        setMessage({ ok: true, text: "Foto dihapus." });
        router.refresh();
      }
    } catch {
      setMessage({ ok: false, text: "Tidak dapat terhubung ke server." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl || fallbackUrl} alt="Foto destinasi" className="h-32 w-48 rounded-md border border-neutral-300 object-cover" />
      <div className="space-y-2 text-sm">
        <label className={`inline-block cursor-pointer rounded-lg bg-brand-green px-4 py-2 text-white hover:brightness-110 ${busy ? "pointer-events-none opacity-60" : ""}`}>
          {busy ? "Memproses..." : isUploaded ? "Ganti foto" : "Unggah foto"}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} disabled={busy} className="sr-only" />
        </label>
        {isUploaded && (
          <div>
            <button type="button" onClick={remove} disabled={busy} className="text-red-700 underline disabled:opacity-60">
              Hapus foto
            </button>
          </div>
        )}
        <p className="max-w-xs text-xs text-neutral-600">JPG, PNG, atau WebP. Foto otomatis dikecilkan. Pastikan foto milikmu sendiri atau kamu berhak memakainya.</p>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-emerald-700" : "text-red-700"}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
