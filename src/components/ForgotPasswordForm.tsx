"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import Turnstile, { type TurnstileHandle } from "@/components/Turnstile";
import { buttonClass, cardClass, inputClass } from "@/components/auth-styles";

export default function ForgotPasswordForm({ turnstileSiteKey }: { turnstileSiteKey: string | null }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotFound(false);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken: captcha }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Terjadi kesalahan. Coba lagi.");
        setNotFound(json.code === "EMAIL_NOT_FOUND");
      } else setSentTo(json.email ?? email);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
      turnstile.current?.reset();
    }
  }

  if (sentTo) {
    return (
      <div className={cardClass}>
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold">Cek email kamu</h1>
          <p className="text-base">
            Kami sudah mengirim tautan untuk mengatur ulang password ke <strong>{sentTo}</strong>.
          </p>
          <Link href="/masuk" className="text-base text-brand-link underline">Kembali ke halaman masuk</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cardClass}>
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Lupa password</h1>
        <p className="text-base">Masukkan email akun kamu. Kami akan mengirim tautan untuk membuat password baru.</p>
        <label className="flex flex-col gap-2 text-base">
          Email
          <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="gabriel@example.com" className={inputClass} />
        </label>
        {turnstileSiteKey && <Turnstile ref={turnstile} siteKey={turnstileSiteKey} onToken={setCaptcha} />}
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
            {notFound && (
              <>
                {" "}
                <Link href="/daftar" className="text-brand-link underline">Daftar sekarang</Link>
              </>
            )}
          </p>
        )}
        <button type="submit" disabled={loading || (!!turnstileSiteKey && !captcha)} className={buttonClass}>
          {loading ? "Memproses..." : "Kirim tautan reset"}
        </button>
        <Link href="/masuk" className="text-base text-brand-link underline">Kembali ke halaman masuk</Link>
      </div>
    </form>
  );
}
