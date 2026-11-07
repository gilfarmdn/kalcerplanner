"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Tombol kurator untuk satu akun: Nonaktifkan / Aktifkan, dan Hapus (hanya untuk akun nonaktif). */
export default function AccountActions({ id, name, deactivated }: { id: string; name: string; deactivated: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(method: "PATCH" | "DELETE", body?: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Gagal memproses.");
        return;
      }
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {deactivated ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => call("PATCH", { action: "ACTIVATE" })}
              className="rounded-[5px] border border-emerald-700 px-3 py-1 text-xs font-semibold text-emerald-800 disabled:opacity-60"
            >
              Aktifkan
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => confirm(`Hapus akun ${name} secara permanen? Rencana dan stempelnya ikut terhapus; destinasi miliknya disembunyikan.`) && call("DELETE")}
              className="rounded-[5px] bg-red-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
            >
              Hapus
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => confirm(`Nonaktifkan akun ${name}? Akun tidak bisa masuk sampai diaktifkan kembali.`) && call("PATCH", { action: "DEACTIVATE" })}
            className="rounded-[5px] border border-red-700 px-3 py-1 text-xs font-semibold text-red-700 disabled:opacity-60"
          >
            Nonaktifkan
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
