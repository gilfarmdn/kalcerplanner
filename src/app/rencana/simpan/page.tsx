import type { Metadata } from "next";
import Link from "next/link";
import SavePlanButton from "@/components/SavePlanButton";
import SiteShell from "@/components/SiteShell";
import { requireUser } from "@/lib/auth";
import { formatRupiah, styleLabel } from "@/lib/culture";
import { getPlannerEvents, getPlannerObjects } from "@/lib/culture-db";
import { buildSinglePlan } from "@/lib/planner";
import { formatRentang } from "@/lib/tanggal";
import { saveTripSchema } from "@/lib/validators";

export const metadata: Metadata = { title: "Simpan Rencana — KalcerPlanner" };
export const dynamic = "force-dynamic";

/**
 * Tujuan setelah pengunjung masuk dari tombol "Simpan Rencana". Rencana dibawa lewat alamat, dihitung ulang
 * oleh server, lalu disimpan hanya setelah pengguna menekan tombol (agar tautan tidak bisa menyimpan sendiri).
 */
export default async function SimpanRencanaPage({ searchParams }: { searchParams: { data?: string | string[] } }) {
  const raw = Array.isArray(searchParams.data) ? searchParams.data[0] : searchParams.data;
  await requireUser(`/rencana/simpan?data=${encodeURIComponent(raw ?? "")}`);

  let parsed: ReturnType<typeof saveTripSchema.safeParse> | null = null;
  try {
    parsed = raw ? saveTripSchema.safeParse(JSON.parse(raw)) : null;
  } catch {
    parsed = null;
  }

  let content: React.ReactNode;
  if (!parsed || !parsed.success) {
    content = <p>Data rencana tidak valid atau sudah kedaluwarsa. Silakan susun ulang rencanamu.</p>;
  } else {
    const { style, input } = parsed.data;
    const [objects, events] = await Promise.all([getPlannerObjects(), getPlannerEvents()]);
    const plan = buildSinglePlan(style, objects, events, input);
    if (plan.itemCount === 0) {
      content = <p>Rencana ini kosong. Ubah minat atau anggaranmu lalu coba lagi.</p>;
    } else {
      content = (
        <>
          <dl className="grid gap-3 text-left sm:grid-cols-2">
            <div className="rounded-[10px] border border-black bg-white p-3">
              <dt className="text-sm text-neutral-600">Gaya</dt>
              <dd className="text-lg font-semibold">{styleLabel[style]}</dd>
            </div>
            <div className="rounded-[10px] border border-black bg-white p-3">
              <dt className="text-sm text-neutral-600">Tanggal</dt>
              <dd className="text-lg font-semibold">{formatRentang(input.startDate, input.endDate)}</dd>
            </div>
            <div className="rounded-[10px] border border-black bg-white p-3">
              <dt className="text-sm text-neutral-600">Tempat budaya</dt>
              <dd className="text-lg font-semibold">{plan.itemCount} tempat</dd>
            </div>
            <div className="rounded-[10px] border border-black bg-white p-3">
              <dt className="text-sm text-neutral-600">Perkiraan total</dt>
              <dd className="text-lg font-semibold">{formatRupiah(plan.total)}</dd>
            </div>
          </dl>
          <SavePlanButton payload={parsed.data} />
        </>
      );
    }
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-[640px] px-4 pb-20 pt-10 text-center">
        <h1 className="font-serif text-3xl font-bold">Simpan rencanamu</h1>
        <p className="mt-2 text-neutral-700">Kamu sudah masuk. Periksa ringkasan di bawah, lalu simpan ke My Trip.</p>
        <div className="mt-8">{content}</div>
        <p className="mt-8 text-sm">
          <Link href="/rencana" className="text-brand-link underline">
            Kembali ke halaman Rencana
          </Link>
        </p>
      </div>
    </SiteShell>
  );
}
