"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";

export type SidebarItem = { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean };

const KEY = "kp_sidebar_collapsed"; // pilihan pengguna, berlaku untuk semua dasbor akun

/**
 * Menu samping dasbor akun. Di layar lebar bisa diperkecil menjadi ikon saja (pilihan diingat di peramban);
 * di layar kecil menjadi baris menu yang bisa digeser.
 */
export default function SidebarNav({
  items,
  pathname,
  label,
}: {
  items: SidebarItem[];
  pathname: string;
  label: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(KEY) === "1");
    } catch {
      /* penyimpanan diblokir: tetap lebar */
    }
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      /* cukup untuk halaman ini */
    }
  }

  const toggleLabel = collapsed ? "Perlebar menu" : "Perkecil menu";
  const ToggleIcon = collapsed ? ChevronRight : ChevronLeft;

  return (
    // Garis kanan menjadi pembatas menu dan area konten; tombol panah menempel di garis itu.
    <nav
      aria-label={label}
      className={`relative lg:shrink-0 lg:border-r lg:border-neutral-300 lg:pr-4 lg:transition-[width] lg:duration-200 ${
        collapsed ? "lg:w-[88px]" : "lg:w-[266px]"
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        aria-label={toggleLabel}
        title={toggleLabel}
        className="absolute -right-3.5 top-3 z-10 hidden h-7 w-7 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 shadow-sm transition hover:bg-brand-green hover:text-white lg:flex"
      >
        <ToggleIcon size={16} aria-hidden />
      </button>
      <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-3 lg:overflow-visible lg:pb-0">
        {items.map(({ href, label: itemLabel, icon: Icon, match }) => {
          const on = match(pathname);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                title={collapsed ? itemLabel : undefined}
                className={`flex items-center gap-4 overflow-hidden whitespace-nowrap rounded-md px-4 py-3 font-serif text-sm font-bold transition lg:px-6 ${
                  on ? "bg-brand-green text-white" : "text-[#1e1e1e] hover:bg-neutral-100"
                }`}
              >
                <Icon size={22} aria-hidden className="shrink-0" />
                <span className={collapsed ? "lg:sr-only" : undefined}>{itemLabel}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
