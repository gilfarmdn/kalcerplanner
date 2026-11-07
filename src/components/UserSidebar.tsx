"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, CalendarDays, Globe, Stamp, User } from "lucide-react";

type Item = { href: string; label: string; icon: typeof Globe; match: (p: string) => boolean };

const items: Item[] = [
  { href: "/trip", label: "My Trip", icon: Globe, match: (p) => p.startsWith("/trip") },
  { href: "/rencana", label: "Buat Rencana", icon: CalendarDays, match: (p) => p.startsWith("/rencana") },
  { href: "/jejak", label: "Paspor Budaya", icon: Stamp, match: (p) => p.startsWith("/jejak") },
  { href: "/kunjungan", label: "Daftar Kunjungan", icon: CalendarCheck, match: (p) => p.startsWith("/kunjungan") },
  { href: "/profil", label: "Profil", icon: User, match: (p) => p.startsWith("/profil") },
];

// Halaman umum yang dulu ada di navbar.
{/* const more = [
  { href: "/", label: "Beranda" },
  { href: "/kalender", label: "Kalender Budaya" },
  { href: "/umkm", label: "Galeri UMKM" },
  { href: "/bantuan", label: "Bantuan" },
]; */}

/** Menu samping akun pengguna (di layar kecil menjadi baris menu yang bisa digeser). */
export default function UserSidebar() {
  const pathname = usePathname() ?? "/trip";
  return (
    <nav aria-label="Menu akun" className="lg:w-[250px] lg:shrink-0">
      <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-3 lg:overflow-visible lg:pb-0">
        {items.map(({ href, label, icon: Icon, match }) => {
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
      {/* <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-4 text-xs text-neutral-600 lg:mt-8 lg:flex-col lg:px-6">
        {more.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className={pathname === l.href ? "font-semibold text-brand-green" : "hover:underline"}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul> */}
    </nav>
  );
}
