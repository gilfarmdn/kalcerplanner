import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import CancelVisitButton from "@/components/CancelVisitButton";
import DashboardShell from "@/components/DashboardShell";
import SiteShell from "@/components/SiteShell";
import { requireUser } from "@/lib/auth";
import { roleHome } from "@/lib/role-home";
import { canCancel } from "@/lib/kuota";
import { dayString, formatHariPanjang, hariIniJakarta } from "@/lib/tanggal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Daftar Kunjungan — KalcerPlanner" };
export const dynamic = "force-dynamic";

const statusInfo = {
  BOOKED: { label: "Terdaftar", cls: "bg-emerald-100 text-emerald-900" },
  ATTENDED: { label: "Hadir ✓", cls: "bg-amber-100 text-amber-900" },
  CANCELLED: { label: "Dibatalkan", cls: "bg-neutral-200 text-neutral-800" },
} as const;

/** Semua pendaftaran kunjungan milik pengguna: yang akan datang (bisa dibatalkan s.d. H-1) dan riwayatnya. */
export default async function KunjunganPage() {
  const user = await requireUser("/kunjungan");
  if (user.role !== "TRAVELER") redirect(roleHome(user.role));

  const today = hariIniJakarta();
  const visits = await prisma.visit.findMany({
    where: { userId: user.id },
    orderBy: { visitDate: "asc" },
    take: 300,
    select: {
      id: true,
      visitDate: true,
      partySize: true,
      status: true,
      changeNotice: true,
      object: { select: { name: true, slug: true, zone: true, openTime: true, closeTime: true, status: true } },
      event: { select: { title: true, slug: true, zone: true, openTime: true, closeTime: true, status: true } },
    },
  });

  const rows = visits.map((v) => ({ ...v, date: dayString(v.visitDate) }));
  const upcoming = rows.filter((v) => v.date >= today && v.status !== "CANCELLED");
  const history = rows.filter((v) => !(v.date >= today && v.status !== "CANCELLED")).reverse();

  const card = (v: (typeof rows)[number], withCancel: boolean) => {
    const s = statusInfo[v.status];
    // Kunjungan ke destinasi (boleh dengan kegiatan di dalamnya) atau ke event mandiri.
    const place = v.object
      ? { name: v.object.name, href: `/jelajah/${v.object.slug}`, zone: v.object.zone, openTime: v.object.openTime, closeTime: v.object.closeTime, status: v.object.status, activity: v.event?.title ?? null }
      : { name: v.event?.title ?? "Tempat tidak tersedia", href: v.event ? `/jelajah/event/${v.event.slug}` : "", zone: v.event?.zone ?? "", openTime: v.event?.openTime ?? null, closeTime: v.event?.closeTime ?? null, status: v.event?.status ?? "HIDDEN", activity: null };
    const listed = !!place.href && (place.status === "VERIFIED" || place.status === "SEED");
    return (
      <li key={v.id} className="rounded-[10px] border border-black bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-brown">{formatHariPanjang(v.date)}</p>
            {listed ? (
              <Link href={place.href} className="text-xl font-semibold hover:underline">
                {place.name}
              </Link>
            ) : (
              <p className="text-xl font-semibold">{place.name}</p>
            )}
            <p className="text-sm text-neutral-600">
              {place.activity ? `${place.activity} · ` : ""}
              {place.zone}
              {place.openTime && place.closeTime ? ` · ${place.openTime}–${place.closeTime} WIB` : ""} · {v.partySize} orang
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span>
            {withCancel && v.status === "BOOKED" && (canCancel(v.date) ? <CancelVisitButton id={v.id} /> : <span className="text-xs text-neutral-600">Pembatalan paling lambat H-1</span>)}
          </div>
        </div>
        {v.changeNotice && (
          <p role="alert" className="mt-3 rounded-lg border border-amber-500 bg-amber-50 p-2 text-sm text-amber-900">
            ⚠ {v.changeNotice}
          </p>
        )}
      </li>
    );
  };

  return (
    <SiteShell>
      <DashboardShell heading="Daftar Kunjungan">
        <p className="max-w-2xl text-neutral-700">
          Pendaftaran ke tempat dan event berkuota. Daftarkan kunjungan dari hasil rencana, halaman detail trip, atau halaman detail tempat.
        </p>

        <h2 className="mt-8 font-serif text-2xl font-bold">Akan datang ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">
            Belum ada kunjungan terdaftar.{" "}
            <Link href="/trip" className="text-brand-link underline">
              Buka rencanamu
            </Link>{" "}
            untuk mendaftarkan tempat berkuota.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">{upcoming.map((v) => card(v, true))}</ul>
        )}

        {history.length > 0 && (
          <>
            <h2 className="mt-10 font-serif text-2xl font-bold">Riwayat</h2>
            <ul className="mt-3 space-y-3">{history.map((v) => card(v, false))}</ul>
          </>
        )}
      </DashboardShell>
    </SiteShell>
  );
}
