import Image from "next/image";
import Link from "next/link";

/** Layout layar penuh untuk halaman masuk / daftar / lupa password (Figma: "Web Informasi (Masuk)"). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-screen flex-col items-center overflow-hidden bg-white px-4 pb-12">
      <Image src="/images/hero.svg" alt="" fill priority unoptimized sizes="100vw" className="-z-10 object-cover opacity-60" />
      <Link href="/" aria-label="Kembali ke beranda" className="mb-6 mt-6">
        <Image
          src="/images/logo/logo-trim.png"
          alt="KalcerPlanner"
          width={527}
          height={480}
          unoptimized
          priority
          className="h-32 w-auto sm:h-[200px]"
        />
      </Link>
      {children}
    </div>
  );
}
