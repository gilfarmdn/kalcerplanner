"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Interest } from "@/lib/culture";

export default function BecomePractitioner({ name, interests }: { name: string; interests: Interest[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upgrade() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, interests, becomePractitioner: true }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Gagal memperbarui akun.");
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
    <div className="mt-4">
      <button type="button" onClick={upgrade} disabled={busy} className="btn-primary">
        {busy ? "Memproses..." : "Jadikan akun pelaku budaya"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
