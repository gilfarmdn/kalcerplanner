"use client";

import { usePathname } from "next/navigation";
import { CalendarCheck, CalendarDays, Globe, Stamp, User } from "lucide-react";
import SidebarNav, { type SidebarItem } from "@/components/SidebarNav";

const items: SidebarItem[] = [
  { href: "/trip", label: "My Trip", icon: Globe, match: (p) => p.startsWith("/trip") },
  { href: "/rencana", label: "Buat Rencana", icon: CalendarDays, match: (p) => p.startsWith("/rencana") },
  { href: "/jejak", label: "Paspor Budaya", icon: Stamp, match: (p) => p.startsWith("/jejak") },
  { href: "/kunjungan", label: "Daftar Kunjungan", icon: CalendarCheck, match: (p) => p.startsWith("/kunjungan") },
  { href: "/profil", label: "Profil", icon: User, match: (p) => p.startsWith("/profil") },
];

/** Menu samping akun pengguna (bisa diperkecil menjadi ikon; di layar kecil menjadi baris menu yang bisa digeser). */
export default function UserSidebar() {
  const pathname = usePathname() ?? "/trip";
  return (
    <SidebarNav items={items} pathname={pathname} label="Menu akun" />
  );
}
