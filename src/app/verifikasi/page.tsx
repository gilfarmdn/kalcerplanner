import type { Metadata } from "next";
import AuthLayout from "@/components/AuthLayout";
import VerifyEmail from "@/components/VerifyEmail";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Verifikasi email — KalcerPlanner", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function VerifikasiPage({ searchParams }: { searchParams: { token?: string | string[]; next?: string | string[] } }) {
  const token = Array.isArray(searchParams.token) ? searchParams.token[0] : searchParams.token;
  return (
    <AuthLayout>
      <VerifyEmail token={token ?? ""} next={safeNext(searchParams.next, "/rencana")} />
    </AuthLayout>
  );
}
