"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteDestinationButton({ id, name, kind = "object" }: { id: string; name: string; kind?: "object" | "event" }) {
  const isEvent = kind === "event";
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm(isEvent ? `Hapus event "${name}"? Catatan kunjungannya ikut terhapus dan pendaftar dikabari. Tindakan ini tidak bisa dibatalkan.` : `Hapus destinasi "${name}"? Event dan catatan kunjungannya ikut terhapus. Tindakan ini tidak bisa dibatalkan.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pelaku/${isEvent ? "event-budaya" : "destinasi"}/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Gagal menghapus.");
        return;
      }
      router.push("/destinasi");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={remove} disabled={busy} className="rounded-lg border border-red-600 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60">
        {busy ? "Menghapus..." : isEvent ? "Hapus event" : "Hapus destinasi"}
      </button>
      {error && <p role="alert" className="mt-2 max-w-md text-sm text-red-700">{error}</p>}
    </div>
  );
}
