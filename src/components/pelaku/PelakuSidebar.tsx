"use client";

import { usePathname } from "next/navigation";
import { CalendarPlus, Database, Globe, ShieldCheck, User, Users } from "lucide-react";
import SidebarNav, { type SidebarItem } from "@/components/SidebarNav";

// Halaman lain di bawah /destinasi/ (selain menu di bawah ini) adalah detail destinasi milik My Destination.
const otherPelakuPages = ["/destinasi/tambah", "/destinasi/kunjungan", "/destinasi/profil"];

const items: SidebarItem[] = [
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
const adminItems: SidebarItem[] = [
  { href: "/admin", label: "Kurasi", icon: ShieldCheck, match: (p) => p === "/admin" },
  { href: "/admin/akun", label: "Kelola Akun", icon: Users, match: (p) => p.startsWith("/admin/akun") },
  { href: "/admin/profil", label: "Profil", icon: User, match: (p) => p.startsWith("/admin/profil") },
];

/** Menu samping dasbor pelaku budaya dan kurator (bisa diperkecil menjadi ikon; di layar kecil menjadi baris menu yang bisa digeser). */
export default function PelakuSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname() ?? (isAdmin ? "/admin" : "/destinasi");
  return (
    <SidebarNav items={isAdmin ? adminItems : items} pathname={pathname} label={isAdmin ? "Menu kurator" : "Menu pelaku budaya"} />
  );
}
