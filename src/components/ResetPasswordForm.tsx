"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { buttonClass, cardClass, inputClass } from "@/components/auth-styles";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Konfirmasi password tidak sama.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json.error ?? "Terjadi kesalahan. Coba lagi.");
      else setDone(true);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className={cardClass}>
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold">Tautan tidak valid</h1>
          <p className="text-base">Tautan reset tidak lengkap. Minta tautan baru.</p>
          <Link href="/lupa-password" className="text-base text-brand-link underline">Minta tautan baru</Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className={cardClass}>
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold">Password diperbarui</h1>
          <p className="text-base">Silakan masuk dengan password baru kamu.</p>
          <Link href="/masuk" className={`${buttonClass} flex items-center justify-center`}>Masuk</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cardClass}>
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Buat password baru</h1>
        <label className="flex flex-col gap-2 text-base">
          Password baru
          <input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 8 karakter" className={inputClass} />
        </label>
        <label className="flex flex-col gap-2 text-base">
          Ulangi password
          <input required type="password" minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? "Memproses..." : "Simpan password"}
        </button>
        {error?.includes("kedaluwarsa") && (
          <Link href="/lupa-password" className="text-base text-brand-link underline">Minta tautan baru</Link>
        )}
      </div>
    </form>
  );
}
