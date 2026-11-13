"use client";

import { usePathname } from "next/navigation";
import { CalendarPlus, Database, Globe, PackagePlus, ShieldCheck, ShoppingBag, User, Users } from "lucide-react";
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

// Pelaku UMKM mengelola produk oleh-oleh sendiri. Halaman lain di bawah /produk/ (selain menu di bawah) adalah detail produk.
const otherUmkmPages = ["/produk/tambah", "/produk/profil"];

const umkmItems: SidebarItem[] = [
  {
    href: "/produk",
    label: "Produk Saya",
    icon: ShoppingBag,
    match: (p) => p === "/produk" || (p.startsWith("/produk/") && !otherUmkmPages.some((x) => p.startsWith(x))),
  },
  { href: "/produk/tambah", label: "Tambah Produk", icon: PackagePlus, match: (p) => p.startsWith("/produk/tambah") },
  { href: "/produk/profil", label: "Profil", icon: User, match: (p) => p.startsWith("/produk/profil") },
];

const menus = {
  PRACTITIONER: { items, label: "Menu pelaku budaya", home: "/destinasi" },
  ADMIN: { items: adminItems, label: "Menu kurator", home: "/admin" },
  UMKM: { items: umkmItems, label: "Menu pelaku UMKM", home: "/produk" },
} as const;

/** Menu samping dasbor pelaku budaya, pelaku UMKM, dan kurator (bisa diperkecil menjadi ikon; di layar kecil menjadi baris menu yang bisa digeser). */
export default function PelakuSidebar({ role }: { role: keyof typeof menus }) {
  const menu = menus[role];
  const pathname = usePathname() ?? menu.home;
  return <SidebarNav items={menu.items} pathname={pathname} label={menu.label} />;
}
