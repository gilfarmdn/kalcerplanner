"use client";

import { useEffect, useState } from "react";

export default function LogoutIfSignedIn() {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/session/ping", { method: "POST", cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (cancelled || !json.authenticated) return;
        setLeaving(true);
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {
        return;
      }
      window.location.reload();
    }

    void check();
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) void check();
    };
    window.addEventListener("pageshow", onShow);
    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", onShow);
    };
  }, []);

  return leaving ? (
    <p role="status" className="mt-4 text-sm">Mengeluarkan akun...</p>
  ) : null;
}