import Image from "next/image";
import Link from "next/link";
import LogoutButton from "@/components/pelaku/LogoutButton";
import PelakuSidebar from "@/components/pelaku/PelakuSidebar";
import type { CurrentUser } from "@/lib/auth";

/** Kerangka dasbor pelaku budaya (/destinasi) dan kurator (/admin): logo + akun di atas, sidebar di kiri, tanpa navbar situs. */
export default function PelakuShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-[#1e1e1e]">
      <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 py-4 sm:px-8">
        <Link href="/" aria-label="Ke beranda KalcerPlanner">
          <Image src="/images/logo/logo-trim.png" alt="KalcerPlanner" width={527} height={480} unoptimized priority className="h-16 w-auto sm:h-20" />
        </Link>
        <div className="flex items-center gap-2 text-sm font-semibold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={user.avatarUrl ?? "/images/avatar.svg"} alt="" className="h-6 w-6 rounded-full object-cover" />
          <span className="max-w-[160px] truncate sm:max-w-[240px]">{user.name}</span>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-4 pb-10 sm:px-8 lg:flex-row lg:gap-10">
        <PelakuSidebar isAdmin={user.role === "ADMIN"} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <footer className="mx-auto w-full max-w-[1440px] px-4 pb-4 text-right text-[10px] text-neutral-600 sm:px-8">
        Copyright {new Date().getFullYear()} - KalcerPlanner.id
      </footer>
    </div>
  );
}
