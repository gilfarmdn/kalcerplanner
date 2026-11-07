import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import AuthLayout from "@/components/AuthLayout";
import LogoutIfSignedIn from "@/components/LogoutIfSignedIn";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Daftar — KalcerPlanner" };
export const dynamic = "force-dynamic";

export default async function DaftarPage({ searchParams }: { searchParams: { next?: string | string[] } }) {
  const next = safeNext(searchParams.next, "/rencana");

  return (
    <AuthLayout>
      <LogoutIfSignedIn />
      <AuthForm mode="register" next={next} />
    </AuthLayout>
  );
}
