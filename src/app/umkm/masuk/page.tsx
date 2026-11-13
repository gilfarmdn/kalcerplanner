import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import AuthLayout from "@/components/AuthLayout";
import LogoutIfSignedIn from "@/components/LogoutIfSignedIn";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Masuk UMKM — KalcerPlanner" };
export const dynamic = "force-dynamic";

/** Pintu masuk pelaku UMKM. Setelah masuk, akun UMKM langsung ke dasbor /produk (alamat tujuan ditentukan server sesuai peran). */
export default async function MasukUmkmPage({ searchParams }: { searchParams: { next?: string | string[]; info?: string | string[] } }) {
  const info = Array.isArray(searchParams.info) ? searchParams.info[0] : searchParams.info;
  const next = safeNext(searchParams.next, "");

  return (
    <AuthLayout>
      <LogoutIfSignedIn />
      {info === "timeout" && (
        <p role="status" className="mt-4 w-full max-w-[400px] rounded-lg border border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">
          Sesi berakhir karena tidak ada aktivitas. Silakan masuk kembali.
        </p>
      )}
      <AuthForm mode="login" next={next} audience="umkm" />
    </AuthLayout>
  );
}
