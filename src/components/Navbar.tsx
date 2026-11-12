"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Globe, LogOut, Menu, User, X } from "lucide-react";
import { navLinks } from "@/lib/content";
import { roleHome, type Role } from "@/lib/role-home";

export default function Navbar({ user }: { user: { name: string; role?: Role; avatarUrl?: string | null } | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const [accountShown, setAccountShown] = useState(
    () => typeof window !== "undefined" && !!(window as unknown as { __kpSessionOk?: boolean }).__kpSessionOk,
  );

  useEffect(() => {
    if (!user) return;
    const show = () => setAccountShown(true);
    if ((window as unknown as { __kpSessionOk?: boolean }).__kpSessionOk) show();
    window.addEventListener("kp:session-ok", show);
    // Jaga-jaga bila SessionKeeper tidak berjalan; tidak dipakai bila sesi lama sedang dikeluarkan.
    const fallback = window.setTimeout(() => {
      if (!(window as unknown as { __kpLeaving?: boolean }).__kpLeaving) show();
    }, 1500);
    return () => {
      window.removeEventListener("kp:session-ok", show);
      window.clearTimeout(fallback);
    };
  }, [user]);

  const authButton = user ? (
    <div
      className="flex items-center gap-2"
      style={user && !accountShown ? { visibility: "hidden" } : undefined}
    >
      <Link
        href={roleHome(user.role ?? "TRAVELER")}
        onClick={() => setOpen(false)}
        title="My Trip"
        className="inline-flex max-w-[160px] items-center gap-1.5 truncate rounded-[10px] bg-brand-green px-3 py-2 text-base font-semibold text-white hover:brightness-110"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="h-6 w-6 shrink-0 rounded-full bg-white object-cover" />
        ) : (
          <User size={20} className="shrink-0" />
        )}
        <span className="truncate">{user.name}</span>
      </Link>
      <div data-auth-ui className="flex items-center gap-2"></div>
      <button
        type="button"
        onClick={logout}
        aria-label="Keluar"
        title="Keluar"
        className="rounded-[10px] p-2 hover:bg-neutral-100"
      >
        <LogOut size={20} />
      </button>
    </div>
  ) : (
    <Link
      href="/masuk"
      onClick={() => setOpen(false)}
      className="inline-flex h-[47px] items-center gap-1 rounded-[10px] bg-brand-green px-2 text-l font-semibold text-white hover:brightness-110"
    >
      <User size={27} />
      Masuk
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 bg-white">
      <nav className="flex h-20 items-center px-4 lg:h-[110px] lg:px-0">
        <Link 
          href="/" 
          aria-label="KalcerPlanner beranda" 
          className="flex h-full shrink-0 items-center py-2 lg:ml-6"
        >
          <Image
            src="/images/logo/logo-trim.png"
            alt="KalcerPlanner"
            width={527}
            height={480}
            unoptimized
            priority
            className="h-full w-auto object-contain"
          />
        </Link>

        <ul className="hidden flex-1 items-center justify-center gap-6 whitespace-nowrap text-base font-semibold lg:flex xl:gap-10 xl:text-lg 2xl:gap-14">
          {navLinks.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={isActive(l.href) ? "text-brand-brown" : "text-black hover:text-brand-brown"}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden shrink-0 items-center gap-4 lg:flex xl:gap-6">
          {authButton}
          <button type="button" className="inline-flex items-center gap-1.5 text-base font-semibold xl:text-lg" aria-label="Pilih bahasa">
            <Globe size={22} />
            IDN
            <ChevronDown size={20} />
          </button>
        </div>

        <button
          type="button"
          className="ml-auto lg:hidden"
          aria-label={open ? "Tutup menu" : "Buka menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-neutral-200 bg-white px-4 pb-5 lg:hidden">
          <ul className="flex flex-col gap-4 py-4 text-lg font-semibold">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={isActive(l.href) ? "text-brand-brown" : "text-black"}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          {/* <div className="flex items-center justify-between">
            {authButton}
            <span className="inline-flex items-center gap-2 text-lg font-semibold">
              <Globe size={20} /> IDN
            </span>
          </div> */}
        </div>
      )}
    </header>
  );
}
