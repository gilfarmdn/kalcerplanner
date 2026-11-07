"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/");
    router.refresh();
  }
  return (
    <button type="button" onClick={logout} title="Keluar" aria-label="Keluar" className="rounded-md p-1.5 text-neutral-700 hover:bg-neutral-100">
      <LogOut size={18} aria-hidden />
    </button>
  );
}
