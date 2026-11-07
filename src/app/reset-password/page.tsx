import type { Metadata } from "next";
import AuthLayout from "@/components/AuthLayout";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const metadata: Metadata = { title: "Atur ulang password — KalcerPlanner", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string | string[] } }) {
  const token = Array.isArray(searchParams.token) ? searchParams.token[0] : searchParams.token;
  return (
    <AuthLayout>
      <ResetPasswordForm token={token ?? ""} />
    </AuthLayout>
  );
}
