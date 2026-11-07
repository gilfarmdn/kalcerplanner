"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IMAGE_ACCEPT, MAX_IMAGE_BYTES } from "@/lib/image-rules";

const inputClass =
  "h-10 w-full rounded-lg border border-[#2c2c2c] bg-white px-4 text-base outline-none focus:ring-2 focus:ring-brand-link";

export default function ProfileForm({
  name: initialName,
  email,
  roleLabel,
  avatarUrl: initialAvatar,
}: {
  name: string;
  email: string;
  roleLabel: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [photoMessage, setPhotoMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function photoRequest(init: RequestInit, done: string) {
    setPhotoBusy(true);
    setPhotoMessage(null);
    try {
      const res = await fetch("/api/profile/foto", init);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPhotoMessage({ ok: false, text: json.error ?? "Gagal memproses foto." });
        return;
      }
      setAvatar(json.url ?? null);
      setPhotoMessage({ ok: true, text: done });
      router.refresh();
    } catch {
      setPhotoMessage({ ok: false, text: "Tidak dapat terhubung ke server." });
    } finally {
      setPhotoBusy(false);
    }
  }

  function onPickPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setPhotoMessage({ ok: false, text: "Ukuran foto maksimal 2 MB." });
      return;
    }
    const body = new FormData();
    body.append("file", file);
    photoRequest({ method: "POST", body }, "Foto profil diperbarui.");
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ ok: false, text: json.error ?? "Gagal menyimpan." });
        return;
      }
      setMessage({ ok: true, text: "Profil tersimpan." });
      router.refresh();
    } catch {
      setMessage({ ok: false, text: "Tidak dapat terhubung ke server." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6 rounded-[10px] border border-black bg-white p-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatar ?? "/images/avatar.svg"} alt="Foto profil" className="h-24 w-24 rounded-full border border-neutral-300 object-cover" />
        <div className="space-y-2">
          <p className="text-base font-medium">Foto profil</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={photoBusy}
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-[#2c2c2c] px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-60"
            >
              {photoBusy ? "Memproses..." : avatar ? "Ganti foto" : "Unggah foto"}
            </button>
            {avatar && (
              <button
                type="button"
                disabled={photoBusy}
                onClick={() => confirm("Hapus foto profil?") && photoRequest({ method: "DELETE" }, "Foto profil dihapus.")}
                className="rounded-lg border border-red-700 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                Hapus foto
              </button>
            )}
          </div>
          <p className="text-xs text-neutral-600">JPG, PNG, atau WebP, maksimal 2 MB.</p>
          <input ref={fileRef} type="file" accept={IMAGE_ACCEPT} onChange={onPickPhoto} className="hidden" />
          {photoMessage && (
            <p role={photoMessage.ok ? "status" : "alert"} className={`text-sm ${photoMessage.ok ? "text-emerald-700" : "text-red-700"}`}>
              {photoMessage.text}
            </p>
          )}
        </div>
      </div>

      <label className="block text-base font-medium">
        Nama
        <input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} mt-2`} />
      </label>
      <label className="block text-base font-medium">
        Email
        <input readOnly value={email} className={`${inputClass} mt-2 bg-neutral-100 text-neutral-600`} />
      </label>
      <p className="text-sm text-neutral-700">
        Jenis akun: <strong>{roleLabel}</strong>
      </p>

      {message && (
        <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-700"}`}>
          {message.text}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary h-10 px-6 text-base">
        {busy ? "Menyimpan..." : "Simpan"}
      </button>
    </form>
  );
}
