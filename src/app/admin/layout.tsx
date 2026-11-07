import PelakuShell from "@/components/pelaku/PelakuShell";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Dasbor kurator. Akun lain diarahkan ke halaman utamanya masing-masing. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("ADMIN", "/admin");
  return <PelakuShell user={user}>{children}</PelakuShell>;
}
