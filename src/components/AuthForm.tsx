"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, cardClass, inputClass } from "@/components/auth-styles";

type Props = {
  mode: "login" | "register";
  next: string;
  /** true bila tujuan dibawa lewat tautan (?next=...). Tanpa itu, pelaku budaya diarahkan ke dasbornya. */
  explicitNext?: boolean;
};

export default function AuthForm({ mode, next, explicitNext = false }: Props) {
  const router = useRouter();
  const isLogin = mode === "login";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"TRAVELER" | "PRACTITIONER">("TRAVELER");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setNeedsVerify(false);
    setLoading(true);
    try {
      const res = await fetch(isLogin ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isLogin ? { email, password } : { name, email, password, role, next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Terjadi kesalahan. Coba lagi.");
        if (json.code === "EMAIL_NOT_VERIFIED") setNeedsVerify(true);
        return;
      }
      if (!isLogin) {
        setSentTo(email);
        if (json.emailSent === false) {
          setNotice("Akun dibuat, tetapi email verifikasi gagal dikirim. Gunakan tombol kirim ulang di bawah.");
        }
        return;
      }
      const isPelaku = json.role === "PRACTITIONER" || json.role === "ADMIN";
      router.push(!explicitNext && isPelaku ? "/pelaku" : next);
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: sentTo ?? email, next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json.error ?? "Terjadi kesalahan. Coba lagi.");
      else setNotice("Jika email terdaftar dan belum terverifikasi, tautan baru sudah dikirim.");
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  const loginHref = `/masuk?next=${encodeURIComponent(next)}`;
  const otherHref = `${isLogin ? "/daftar" : "/masuk"}?next=${encodeURIComponent(next)}`;

  if (sentTo) {
    return (
      <div className={cardClass}>
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold">Cek email kamu</h1>
          <p className="text-base">
            Kami mengirim tautan verifikasi ke <strong>{sentTo}</strong>. Klik tautan itu untuk mengaktifkan akun, lalu masuk.
          </p>
          {notice && <p className="text-sm text-neutral-600">{notice}</p>}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="button" onClick={resend} disabled={loading} className={buttonClass}>
            {loading ? "Memproses..." : "Kirim ulang email verifikasi"}
          </button>
          <Link href={loginHref} className="text-base text-brand-link underline">
            Ke halaman masuk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cardClass}>
      <div className="flex flex-col gap-6">
        {!isLogin && (
          <label className="flex flex-col gap-2 text-base">
            Nama
            <input required minLength={2} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" className={inputClass} />
          </label>
        )}

        {!isLogin && (
          <fieldset className="flex flex-col gap-2 text-base">
            <legend className="mb-1">Saya adalah</legend>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="role" checked={role === "TRAVELER"} onChange={() => setRole("TRAVELER")} />
              Wisatawan
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="role" checked={role === "PRACTITIONER"} onChange={() => setRole("PRACTITIONER")} />
              Pelaku budaya (sanggar, pengrajin, pengelola situs)
            </label>
          </fieldset>
        )}

        <label className="flex flex-col gap-2 text-base">
          Email
          <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="gabriel@example.com" className={inputClass} />
        </label>

        <label className="flex flex-col gap-2 text-base">
          Password
          <input
            required
            type="password"
            minLength={isLogin ? 1 : 8}
            autoComplete={isLogin ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isLogin ? "******" : "Minimal 8 karakter"}
            className={inputClass}
          />
        </label>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-neutral-600">{notice}</p>}

        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? "Memproses..." : isLogin ? "Masuk" : "Daftar"}
        </button>

        {isLogin && needsVerify && (
          <button type="button" onClick={() => { setSentTo(email); resend(); }} disabled={loading} className="text-left text-base text-brand-link underline">
            Kirim ulang email verifikasi
          </button>
        )}

        {isLogin && (
          <Link href="/lupa-password" className="text-base text-brand-link underline">
            Lupa password?
          </Link>
        )}

        <p className="text-base">
          {isLogin ? "Belum Punya Akun ? " : "Sudah Punya Akun ? "}
          <Link href={otherHref} className="text-brand-link underline">
            {isLogin ? "Register" : "Masuk"}
          </Link>
        </p>
      </div>
    </form>
  );
}
