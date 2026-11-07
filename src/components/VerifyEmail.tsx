"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cardClass } from "@/components/auth-styles";

type State = "loading" | "ok" | "fail";

/** Memverifikasi lewat POST saat halaman dibuka (bukan GET, agar pemindai tautan email tidak menghabiskan token). */
export default function VerifyEmail({ token, next }: { token: string; next: string }) {
  const [state, setState] = useState<State>(token ? "loading" : "fail");
  const [message, setMessage] = useState("Tautan verifikasi tidak lengkap.");
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true; // cegah panggilan ganda di React strict mode (token sekali pakai)
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (res.ok) setState("ok");
        else {
          setMessage(json.error ?? "Verifikasi gagal.");
          setState("fail");
        }
      })
      .catch(() => {
        setMessage("Tidak dapat terhubung ke server.");
        setState("fail");
      });
  }, [token]);

  const loginHref = `/masuk?next=${encodeURIComponent(next)}`;

  return (
    <div className={cardClass}>
      <div className="flex flex-col gap-4">
        {state === "loading" && <p className="text-base">Memverifikasi email...</p>}
        {state === "ok" && (
          <>
            <h1 className="text-xl font-semibold">Email terverifikasi</h1>
            <p className="text-base">Akun kamu sudah aktif. Silakan masuk.</p>
            <Link href={loginHref} className="text-base text-brand-link underline">Masuk</Link>
          </>
        )}
        {state === "fail" && (
          <>
            <h1 className="text-xl font-semibold">Verifikasi gagal</h1>
            <p role="alert" className="text-base">{message}</p>
            <Link href={loginHref} className="text-base text-brand-link underline">Ke halaman masuk</Link>
          </>
        )}
      </div>
    </div>
  );
}
