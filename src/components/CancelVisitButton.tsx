"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Batalkan pendaftaran kunjungan milik sendiri (server menolak bila kurang dari H-1). */
export default function CancelVisitButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    if (!confirm("Batalkan pendaftaran ini? Kuota akan dikembalikan.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/visits/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json.error ?? "Gagal membatalkan.");
      else router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" disabled={busy} onClick={cancel} className="rounded-lg border border-red-700 px-3 py-1 text-sm text-red-800 hover:bg-red-50 disabled:opacity-60">
        {busy ? "Membatalkan..." : "Batalkan"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
