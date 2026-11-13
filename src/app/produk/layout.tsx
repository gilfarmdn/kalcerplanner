import PelakuShell from "@/components/pelaku/PelakuShell";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Dasbor pelaku UMKM. Akun lain diarahkan ke halaman utamanya masing-masing. */
export default async function ProdukLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("UMKM", "/produk");
  return <PelakuShell user={user}>{children}</PelakuShell>;
}
