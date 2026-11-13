import type { Metadata } from "next";
import Link from "next/link";
import { PackagePlus } from "lucide-react";
import PageHeading from "@/components/pelaku/PageHeading";
import StatusPill from "@/components/pelaku/StatusPill";
import { requireUmkm } from "@/lib/auth";
import { formatRupiah } from "@/lib/culture";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Produk Saya — KalcerPlanner" };
export const dynamic = "force-dynamic";

export default async function ProdukSayaPage() {
  const user = await requireUmkm("/produk");
  const products = await prisma.umkmProduct.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "desc" } });
  const live = products.filter((p) => p.isActive && (p.status === "VERIFIED" || p.status === "SEED")).length;
  const pending = products.filter((p) => p.status === "PENDING").length;

  return (
    <>
      <PageHeading title="Selamat datang kembali" name={user.name} />

      <Link
        href="/produk/tambah"
        className="flex h-[108px] max-w-[275px] items-center justify-center gap-3 rounded-md bg-brand-green px-6 text-lg text-white transition hover:brightness-110 sm:ml-4"
      >
        <PackagePlus size={32} aria-hidden />
        Tambah Produk
      </Link>

      <dl className="mt-6 grid max-w-[640px] grid-cols-3 gap-3 sm:ml-4">
        <Stat label="Produk" value={products.length} />
        <Stat label="Tampil di galeri" value={live} />
        <Stat label="Menunggu verifikasi" value={pending} />
      </dl>

      <h2 className="mb-5 mt-10 text-lg font-semibold sm:ml-4">Produk Saya</h2>
      {products.length === 0 ? (
        <p className="text-neutral-700 sm:ml-4">Belum ada produk. Klik “Tambah Produk” untuk memulai.</p>
      ) : (
        <ul className="grid gap-6 sm:ml-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <li key={p.id} className="overflow-hidden rounded-md shadow-[0_3px_6px_rgba(0,0,0,0.25)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageUrl || `/api/placeholder/${p.id}`} alt={p.name} className="h-36 w-full object-cover sm:h-44" />
              <div className="flex flex-col items-center gap-2 bg-white px-4 pb-3 pt-4">
                <p className="text-center text-sm font-medium">{p.name}</p>
                <p className="text-xs text-neutral-600">
                  {p.zone} · {formatRupiah(p.priceIdr)}
                </p>
                <div className="flex items-center gap-2">
                  <StatusPill status={p.status} />
                  {!p.isActive && <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-[11px] font-medium text-neutral-800">Disembunyikan</span>}
                </div>
                <Link href={`/produk/${p.id}`} className="self-end text-[11px] text-brand-link underline">
                  Lihat Detail
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-neutral-300 px-3 py-2">
      <dt className="text-xs text-neutral-600">{label}</dt>
      <dd className="text-2xl font-semibold">{value}</dd>
    </div>
  );
}
