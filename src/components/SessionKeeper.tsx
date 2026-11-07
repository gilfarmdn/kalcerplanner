"use client";

import { useEffect, useRef } from "react";

const IDLE_MS = 45 * 60 * 1000; // tanpa aktivitas sekian lama -> keluar otomatis
const PING_EVERY_MS = 5 * 60 * 1000; // pengguna aktif -> perbarui sesi di server paling sering tiap 5 menit
const CHECK_EVERY_MS = 30 * 1000;
const KEY = "kp_last_activity"; // dibagi antar tab agar aktivitas di tab lain ikut dihitung
const HB_KEY = "kp_heartbeat"; // denyut waktu terakhir ada tab yang hidup
const HB_EVERY_MS = 5 * 1000;
const HB_STALE_MS = 15 * 1000; // untuk tab yang dipulihkan: denyut lebih tua dari ini = semua tab sudah ditutup
const HB_STALE_FALLBACK_MS = 3 * 60 * 1000; // bila peramban tidak mendukung Web Locks, pakai denyut saja (lebih longgar)
const LOCK_NAME = "kp-tab-alive";
const TAB_KEY = "kp_tab"; // penanda per tab (sessionStorage): ada = tab ini sudah pernah dipakai, mis. dimuat ulang
const IDLE_URL = "/masuk?info=timeout"; // sesi habis karena tidak aktif
const RESTART_URL = "/"; // semua tab ditutup lalu situs dibuka lagi: kembali ke landing page

const clearMarks = () => {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(HB_KEY);
  } catch {
    /* penyimpanan diblokir */
  }
};

/** Menampilkan kembali bagian navbar yang disembunyikan CSS selama pemeriksaan sesi (lihat globals.css). */
const reveal = () => {
  document.documentElement.removeAttribute("data-kp-check");
  (window as unknown as { __kpSessionOk?: boolean }).__kpSessionOk = true;
  window.dispatchEvent(new Event("kp:session-ok"));
};

/**
 * Apakah SUDAH ada tab situs ini yang hidup saat halaman ini dimuat? Dicek lewat Web Locks: setiap tab memegang
 * kunci bersama selama terbuka, dan kunci otomatis lepas saat tab ditutup (tidak terpengaruh tab latar belakang yang
 * timernya diperlambat). Dihitung sekali per pemuatan halaman, SEBELUM tab ini memegang kuncinya sendiri.
 * null = peramban tidak mendukung.
 */
const aliveAtLoad: Promise<boolean | null> =
  typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.locks?.query
    ? navigator.locks
        .query()
        .then((q) => !!q.held?.some((l) => l.name === LOCK_NAME))
        .catch(() => null)
    : Promise.resolve(null);

/** Apakah tab ini sudah pernah dipakai (penanda sessionStorage)? Tab baru = false. Dibaca sekali sebelum penanda ditulis. */
const hadTabMarker: boolean = (() => {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(TAB_KEY) === "1";
  } catch {
    return true; // penyimpanan diblokir: jangan mengeluarkan pengguna karena itu
  }
})();

/**
 * Dipasang di root layout (selalu, bukan hanya saat login).
 * Saat login: menghitung aktivitas, memperbarui sesi server, keluar otomatis setelah 45 menit tanpa aktivitas, dan keluar
 * bila SEMUA tab situs sempat ditutup (lalu situs dibuka lagi).
 * Saat tidak login: hanya membersihkan penanda lama.
 */
export default function SessionKeeper({ loggedIn }: { loggedIn: boolean }) {
  // Pemeriksaan "semua tab sempat ditutup" hanya berlaku bila halaman ini DIMUAT dalam keadaan login, dan hanya sekali.
  // Bila pengguna baru saja login di halaman ini (navigasi klien setelah form masuk), cookie-nya jelas baru, bukan sisa.
  const restartCheckPending = useRef(loggedIn);

  // Setiap tab memegang kunci bersama selama terbuka: itulah tanda "masih ada tab hidup" bagi tab lain.
  useEffect(() => {
    try {
      sessionStorage.setItem(TAB_KEY, "1");
    } catch {
      /* abaikan */
    }
    let release: (() => void) | undefined;
    let stopped = false;
    void aliveAtLoad.then(() => {
      if (stopped || typeof navigator === "undefined" || !navigator.locks) return;
      void navigator.locks.request(LOCK_NAME, { mode: "shared" }, () => new Promise<void>((resolve) => (release = resolve)));
    });
    return () => {
      stopped = true;
      release?.();
    };
  }, []);

  useEffect(() => {
    if (!loggedIn) {
      clearMarks();
      reveal();
      return;
    }

    let cancelled = false;
    let cleanup: (() => void) | undefined;
    void aliveAtLoad.then((alive) => {
      if (cancelled) return;
      // Dipakai di sini (bukan di badan efek) agar efek yang dijalankan dua kali oleh React Strict Mode tidak melewatinya.
      const checkRestart = restartCheckPending.current;
      restartCheckPending.current = false;

      let mem = Date.now();
      let lastPing = Date.now();
      let lastTouch = 0;
      let leaving = false;

      const logoutAndGo = async (url: string) => {
        if (leaving) return;
        leaving = true;
        clearMarks();
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
        window.location.href = url;
      };

      // Semua tab situs pernah ditutup, lalu situs dibuka lagi (cookie sesi tetap ada karena peramban masih hidup): keluar.
      //  - Tab baru (tanpa penanda) dan tidak ada tab lain yang hidup: langsung keluar.
      //  - Tab yang dimuat ulang / dipulihkan (ada penanda): keluar hanya bila denyut terakhir sudah lama.
      if (checkRestart) {
        try {
          const prev = Number(localStorage.getItem(HB_KEY) || 0);
          const age = prev ? Date.now() - prev : 0;
          const fresh = alive === null ? !!prev && age > HB_STALE_FALLBACK_MS : alive === false && (!hadTabMarker || (!!prev && age > HB_STALE_MS));
          if (fresh) {
            // Navbar tetap tersembunyi sampai pindah halaman, meski logout lambat (batas 1,5 detik di Navbar/CSS diabaikan).
            document.documentElement.setAttribute("data-kp-check", "leaving");
            (window as unknown as { __kpLeaving?: boolean }).__kpLeaving = true;
            void logoutAndGo(RESTART_URL);
            return;
          }
        } catch {
          /* lewati pemeriksaan ini */
        }
      }

      reveal(); // sesi sah: tampilkan nama akun di navbar

      const last = () => {
        try {
          return Math.max(mem, Number(localStorage.getItem(KEY)) || 0);
        } catch {
          return mem;
        }
      };
      const touch = () => {
        mem = Date.now();
        try {
          localStorage.setItem(KEY, String(mem));
        } catch {
          /* cukup memori tab ini */
        }
      };
      const onActivity = () => {
        const now = Date.now();
        if (now - lastTouch < 5000) return; // cukup dicatat tiap 5 detik
        lastTouch = now;
        touch();
      };
      const beat = () => {
        try {
          localStorage.setItem(HB_KEY, String(Date.now()));
        } catch {
          /* abaikan */
        }
      };

      beat();
      touch();
      const hb = window.setInterval(beat, HB_EVERY_MS);
      // Muat ulang / pindah halaman penuh: catat denyut terakhir agar tidak dianggap "semua tab ditutup".
      window.addEventListener("pagehide", beat);

      const check = async () => {
        const now = Date.now();
        if (now - last() > IDLE_MS) {
          await logoutAndGo(IDLE_URL);
          return;
        }
        if (now - lastPing > PING_EVERY_MS && last() > lastPing) {
          lastPing = now;
          try {
            const res = await fetch("/api/session/ping", { method: "POST" });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json.authenticated === false) window.location.href = IDLE_URL;
          } catch {
            /* offline: coba lagi di putaran berikutnya */
          }
        }
      };

      const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
      events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
      const onVisible = () => {
        if (document.visibilityState === "visible") void check(); // setelah laptop bangun dari tidur
      };
      document.addEventListener("visibilitychange", onVisible);
      const id = window.setInterval(() => void check(), CHECK_EVERY_MS);

      cleanup = () => {
        events.forEach((e) => window.removeEventListener(e, onActivity));
        document.removeEventListener("visibilitychange", onVisible);
        window.removeEventListener("pagehide", beat);
        window.clearInterval(id);
        window.clearInterval(hb);
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [loggedIn]);

  return null;
}