import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import AuthLayout from "@/components/AuthLayout";
import LogoutIfSignedIn from "@/components/LogoutIfSignedIn";
import { safeNext } from "@/lib/safe-next";
import { turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = { title: "Daftar UMKM — KalcerPlanner" };
export const dynamic = "force-dynamic";

/** Pendaftaran pelaku UMKM: akun yang dibuat berperan UMKM. */
export default async function DaftarUmkmPage({ searchParams }: { searchParams: { next?: string | string[] } }) {
  const next = safeNext(searchParams.next, "");

  return (
    <AuthLayout>
      <LogoutIfSignedIn />
      <AuthForm mode="register" next={next} turnstileSiteKey={turnstileSiteKey()} audience="umkm" />
    </AuthLayout>
  );
}
