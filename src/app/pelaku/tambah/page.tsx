import type { Metadata } from "next";
import ObjectForm from "@/components/ObjectForm";
import PageHeading from "@/components/pelaku/PageHeading";
import { requirePractitioner } from "@/lib/auth";

export const metadata: Metadata = { title: "Tambah Destinasi — KalcerPlanner" };
export const dynamic = "force-dynamic";

export default async function TambahDestinasiPage() {
  await requirePractitioner("/pelaku/tambah");
  return (
    <>
      <PageHeading title="Tambah Destinasi" />
      <p className="mb-4 max-w-2xl text-sm text-neutral-700">
        Pengajuanmu akan dicek kurator sebelum tampil di rekomendasi. Isi dengan jujur; pastikan harga dan jadwal sesuai.
      </p>
      <div className="max-w-3xl">
        <ObjectForm />
      </div>
    </>
  );
}
