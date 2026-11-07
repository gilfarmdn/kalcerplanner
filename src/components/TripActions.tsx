"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Claim a Paspor Budaya stamp for a place, with an optional "what I learned" note. */
export function StampButton({ objectId }: { objectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectId, note: note.trim() || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Gagal menyimpan stempel.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-[5px] border border-brand-green px-3 py-1 text-sm font-semibold text-brand-green hover:bg-brand-green hover:text-white">
        Cap stempel
      </button>
    );
  }

  return (
    <div className="w-full max-w-md space-y-2">
      <label className="block text-sm font-medium">
        Yang kupelajari (opsional)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
          className="mt-1 w-full rounded-[5px] border border-neutral-500 p-2 text-sm"
          placeholder="Mis. motif parang dulu hanya dikenakan kerabat keraton…"
        />
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={submit} disabled={busy} className="rounded-[5px] bg-brand-green px-3 py-1 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? "Menyimpan..." : "Simpan stempel"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-[5px] border border-neutral-500 px-3 py-1 text-sm">
          Batal
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function DeleteTripButton({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Gagal menghapus.");
        return;
      }
      router.push("/trip");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-sm text-red-700 underline">
        Hapus rencana
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-3 text-sm">
      Hapus rencana ini? Stempel yang sudah kamu klaim tetap tersimpan.
      <button type="button" onClick={remove} disabled={busy} className="rounded-[5px] bg-red-700 px-3 py-1 font-semibold text-white disabled:opacity-60">
        {busy ? "Menghapus..." : "Ya, hapus"}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="underline">
        Batal
      </button>
      {error && <span role="alert" className="text-red-700">{error}</span>}
    </span>
  );
}
