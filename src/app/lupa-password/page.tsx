import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthLayout from "@/components/AuthLayout";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";
import { getSession } from "@/lib/auth";
import { turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = { title: "Lupa password — KalcerPlanner" };
export const dynamic = "force-dynamic";

export default async function LupaPasswordPage() {
  if (await getSession()) redirect("/rencana");
  return (
    <AuthLayout>
      <ForgotPasswordForm turnstileSiteKey={turnstileSiteKey()} />
    </AuthLayout>
  );
}
