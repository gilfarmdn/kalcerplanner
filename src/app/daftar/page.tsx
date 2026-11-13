import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import AuthLayout from "@/components/AuthLayout";
import LogoutIfSignedIn from "@/components/LogoutIfSignedIn";
import { safeNext } from "@/lib/safe-next";
import { turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = { title: "Daftar — KalcerPlanner" };
export const dynamic = "force-dynamic";

export default async function DaftarPage({ searchParams }: { searchParams: { next?: string | string[]; peran?: string | string[] } }) {
  const next = safeNext(searchParams.next, "/rencana");
  // ?peran=umkm / ?peran=pelaku memilihkan peran di form; masuk dan daftar tetap satu halaman untuk semua peran.
  const peran = (Array.isArray(searchParams.peran) ? searchParams.peran[0] : searchParams.peran)?.toLowerCase();
  const initialRole = peran === "umkm" ? "UMKM" : peran === "pelaku" ? "PRACTITIONER" : "TRAVELER";

  return (
    <AuthLayout>
      <LogoutIfSignedIn />
      <AuthForm mode="register" next={next} turnstileSiteKey={turnstileSiteKey()} initialRole={initialRole} />
    </AuthLayout>
  );
}
