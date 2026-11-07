"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarPlus, Database, Globe, ShieldCheck, User, Users } from "lucide-react";

type Item = { href: string; label: string; icon: typeof Globe; match: (p: string) => boolean };

// Halaman lain di bawah /destinasi/ (selain menu di bawah ini) adalah detail destinasi milik My Destination.
const otherPelakuPages = ["/destinasi/tambah", "/destinasi/kunjungan", "/destinasi/profil"];

const items: Item[] = [
  {
    href: "/destinasi",
    label: "My Destination",
    icon: Globe,
    match: (p) => p === "/destinasi" || (p.startsWith("/destinasi/") && !otherPelakuPages.some((x) => p.startsWith(x))),
  },
  { href: "/destinasi/tambah", label: "Tambah Destinasi", icon: CalendarPlus, match: (p) => p.startsWith("/destinasi/tambah") },
  { href: "/destinasi/kunjungan", label: "Riwayat Kunjungan", icon: Database, match: (p) => p.startsWith("/destinasi/kunjungan") },
  { href: "/destinasi/profil", label: "Profil", icon: User, match: (p) => p.startsWith("/destinasi/profil") },
];

// Kurator hanya memverifikasi data wisata dan mengelola akun; tidak menambah / mengubah wisata.
const adminItems: Item[] = [
  { href: "/admin", label: "Kurasi", icon: ShieldCheck, match: (p) => p === "/admin" },
  { href: "/admin/akun", label: "Kelola Akun", icon: Users, match: (p) => p.startsWith("/admin/akun") },
  { href: "/admin/profil", label: "Profil", icon: User, match: (p) => p.startsWith("/admin/profil") },
];

/** Menu samping dasbor pelaku budaya dan kurator (di layar kecil menjadi baris menu yang bisa digeser). */
export default function PelakuSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname() ?? (isAdmin ? "/admin" : "/destinasi");
  const list = isAdmin ? adminItems : items;
  return (
    <nav aria-label={isAdmin ? "Menu kurator" : "Menu pelaku budaya"}className="lg:w-[250px] lg:shrink-0">
      <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-3 lg:overflow-visible lg:pb-0">
        {list.map(({ href, label, icon: Icon, match }) => {
          const on = match(pathname);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={`flex items-center gap-4 rounded-md px-4 py-3 font-serif text-sm font-bold transition lg:px-6 ${
                  on ? "bg-brand-green text-white" : "text-[#1e1e1e] hover:bg-neutral-100"
                }`}
              >
                <Icon size={22} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
