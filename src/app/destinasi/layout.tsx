import PelakuShell from "@/components/pelaku/PelakuShell";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Dasbor pelaku budaya. Akun lain diarahkan ke halaman utamanya masing-masing. */
export default async function DestinasiLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("PRACTITIONER", "/destinasi");
  return <PelakuShell user={user}>{children}</PelakuShell>;
}
