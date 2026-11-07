"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Menyimpan rencana yang dibawa dari halaman Rencana setelah pengunjung masuk. */
export default function SavePlanButton({ payload }: { payload: object }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Gagal menyimpan rencana.");
        return;
      }
      router.push(`/trip/${json.id}`);
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6">
      <button type="button" onClick={save} disabled={saving} className="btn-primary h-[47px] w-[220px] text-xl">
        {saving ? "Menyimpan..." : "Simpan Rencana"}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
