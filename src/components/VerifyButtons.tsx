"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Curator controls: verify (with impact flags) or reject a submitted object. */
export default function VerifyButtons({ objectId, kind = "object" }: { objectId: string; kind?: "object" | "event" }) {
  const router = useRouter();
  const [localRun, setLocalRun] = useState(true);
  const [hiddenGem, setHiddenGem] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "VERIFY" | "REJECT") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/${kind === "event" ? "events" : "objects"}/${objectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "VERIFY" ? { action, localRun, hiddenGem } : { action }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Gagal memperbarui.");
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
    <div className="mt-3 space-y-2 border-t border-neutral-300 pt-3 text-sm">
      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={localRun} onChange={(e) => setLocalRun(e.target.checked)} />
          Dikelola pelaku / komunitas setempat
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={hiddenGem} onChange={(e) => setHiddenGem(e.target.checked)} />
          Kurang padat pengunjung
        </label>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => act("VERIFY")} disabled={busy} className="rounded-[5px] bg-emerald-700 px-3 py-1 font-semibold text-white disabled:opacity-60">
          Verifikasi
        </button>
        <button type="button" onClick={() => act("REJECT")} disabled={busy} className="rounded-[5px] border border-red-700 px-3 py-1 font-semibold text-red-700 disabled:opacity-60">
          Tolak
        </button>
      </div>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
