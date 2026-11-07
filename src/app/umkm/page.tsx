import type { Metadata } from "next";
import SiteShell from "@/components/SiteShell";
import UmkmGallery from "@/components/UmkmGallery";
import { umkmProducts } from "@/lib/content";

export const metadata: Metadata = { title: "Galeri UMKM — KalcerPlanner" };
export const dynamic = "force-dynamic";

/** Acak urutan (Fisher-Yates) agar produk yang tampil berbeda tiap halaman dimuat. */
function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function UmkmPage() {
  return (
    <SiteShell>
      <UmkmGallery products={shuffle(umkmProducts)} />
    </SiteShell>
  );
}
