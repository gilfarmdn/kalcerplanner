import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHeading from "@/components/pelaku/PageHeading";
import StatusPill from "@/components/pelaku/StatusPill";
import DeleteProductButton from "@/components/umkm/DeleteProductButton";
import ProductForm from "@/components/umkm/ProductForm";
import { requireUmkm } from "@/lib/auth";
import { formatRupiah } from "@/lib/culture";
import { prisma } from "@/lib/prisma";
import { knownZones } from "@/lib/umkm";

export const metadata: Metadata = { title: "Detail Produk — KalcerPlanner" };
export const dynamic = "force-dynamic";

export default async function ProdukDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUmkm(`/produk/${params.id}`);
  const product = await prisma.umkmProduct.findFirst({ where: { id: params.id, ownerId: user.id } });
  if (!product) notFound();
  const zones = await knownZones();

  return (
    <>
      <PageHeading title="Detail Produk" />

      <div className="max-w-3xl space-y-10">
        <section className="overflow-hidden rounded-md shadow-[0_3px_6px_rgba(0,0,0,0.25)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.imageUrl || `/api/placeholder/${product.id}`} alt={product.name} className="h-48 w-full object-cover sm:h-64" />
          <div className="space-y-2 bg-white p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold">{product.name}</h2>
              <StatusPill status={product.status} />
              {!product.isActive && <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-[11px] font-medium text-neutral-800">Disembunyikan</span>}
            </div>
            <p className="text-sm text-neutral-600">
              {product.umkm} · {product.zone} · {formatRupiah(product.priceIdr)}
            </p>
            <p className="text-sm">{product.story}</p>
            {product.status === "PENDING" && (
              <p className="rounded bg-amber-50 p-2 text-xs text-amber-900">Produk ini belum tampil untuk wisatawan. Kurator akan memeriksanya terlebih dahulu.</p>
            )}
            {product.status === "REJECTED" && (
              <p className="rounded bg-red-50 p-2 text-xs text-red-900">Pengajuan ditolak kurator. Perbaiki data lalu simpan untuk diajukan ulang.</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Ubah data produk</h2>
          {product.status !== "PENDING" && (
            <p className="mb-3 text-xs text-neutral-600">Mengubah nama, harga, wilayah, cerita, atau foto membuat produk dicek ulang kurator sebelum tampil kembali.</p>
          )}
          <ProductForm
            zones={zones}
            product={{
              id: product.id,
              name: product.name,
              umkm: product.umkm,
              zone: product.zone,
              priceIdr: product.priceIdr,
              story: product.story,
              imageUrl: product.imageUrl,
              isActive: product.isActive,
            }}
          />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-red-800">Zona berbahaya</h2>
          <DeleteProductButton id={product.id} name={product.name} />
        </section>
      </div>
    </>
  );
}
