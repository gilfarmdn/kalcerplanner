import type { Metadata } from "next";
import PageHeading from "@/components/pelaku/PageHeading";
import ProductForm from "@/components/umkm/ProductForm";
import { requireUmkm } from "@/lib/auth";
import { knownZones } from "@/lib/umkm";

export const metadata: Metadata = { title: "Tambah Produk — KalcerPlanner" };
export const dynamic = "force-dynamic";

export default async function TambahProdukPage() {
  const user = await requireUmkm("/produk/tambah");
  const zones = await knownZones();
  return (
    <>
      <PageHeading title="Tambah Produk" />
      <p className="mb-4 max-w-2xl text-sm text-neutral-700">
        Pengajuanmu akan dicek kurator sebelum tampil di Galeri UMKM dan saran oleh-oleh. Isi dengan jujur; pastikan harga dan cerita sesuai.
      </p>
      <div className="max-w-3xl">
        <ProductForm defaultUmkm={user.name} zones={zones} />
      </div>
    </>
  );
}
