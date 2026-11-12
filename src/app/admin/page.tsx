import type { Metadata } from "next";
import PageHeading from "@/components/pelaku/PageHeading";
import VerifyButtons from "@/components/VerifyButtons";
import { requireRole } from "@/lib/auth";
import { interestInfo, kindLabel } from "@/lib/culture";
import { prisma } from "@/lib/prisma";
import { formatRentang } from "@/lib/tanggal";

export const metadata: Metadata = { title: "Kurasi — KalcerPlanner" };
export const dynamic = "force-dynamic";

export default async function KurasiPage() {
  await requireRole("ADMIN", "/admin");

  const [pending, pendingEvents] = await Promise.all([
    prisma.culturalObject.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { owner: { select: { name: true, email: true } } },
    }),
    // Event budaya diajukan lewat tabel tersendiri (CulturalEvent), jadi antreannya juga terpisah.
    prisma.culturalEvent.findMany({
      where: { status: "PENDING", ownerId: { not: null }, objectId: null },
      orderBy: { createdAt: "asc" },
      include: { owner: { select: { name: true, email: true } } },
    }),
  ]);

  return (
    <>
      <PageHeading title="Kurasi" />
      <h2 className="text-lg font-semibold">Objek budaya menunggu verifikasi ({pending.length})</h2>
      {pending.length === 0 ? (
        <p className="mt-2 text-neutral-700">Tidak ada pengajuan.</p>
      ) : (
        <ul className="mt-4 max-w-3xl space-y-4">
          {pending.map((o) => (
            <li key={o.id} className="rounded-[10px] border border-neutral-400 bg-white p-4">
              <p className="text-lg font-semibold">{o.name}</p>
              <p className="text-sm text-neutral-600">
                {kindLabel[o.kind]} · {interestInfo[o.interest].label} · {o.zone} · diajukan oleh {o.owner?.name ?? "—"} ({o.owner?.email ?? "—"})
              </p>
              <p className="mt-2 text-sm">{o.summary}</p>
              <p className="mt-2 text-sm">
                <strong>Makna:</strong> {o.meaning}
              </p>
              {o.etiquette.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {o.etiquette.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-neutral-600">
                Koordinat {o.lat}, {o.lng} · Rp {o.priceIdr.toLocaleString("id-ID")} · {o.durationMin} menit ·{" "}
                {o.dailyQuota != null ? `kuota ${o.dailyQuota} orang/tanggal` : "tanpa pendaftaran"}
                {o.openTime && o.closeTime && ` · ${o.openTime}–${o.closeTime} WIB`}
              </p>
              <VerifyButtons objectId={o.id} />
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 text-lg font-semibold">Event budaya menunggu verifikasi ({pendingEvents.length})</h2>
      {pendingEvents.length === 0 ? (
        <p className="mt-2 text-neutral-700">Tidak ada pengajuan event.</p>
      ) : (
        <ul className="mt-4 max-w-3xl space-y-4">
          {pendingEvents.map((e) => (
            <li key={e.id} className="rounded-[10px] border border-neutral-400 bg-white p-4">
              <p className="text-lg font-semibold">{e.title}</p>
              <p className="text-sm text-neutral-600">
                Event · {e.interest ? interestInfo[e.interest].label : "—"} · {e.zone ?? "—"} · diajukan oleh {e.owner?.name ?? "—"} ({e.owner?.email ?? "—"})
              </p>
              <p className="mt-2 text-sm">{e.description}</p>
              {e.meaning && (
                <p className="mt-2 text-sm">
                  <strong>Makna:</strong> {e.meaning}
                </p>
              )}
              {e.etiquette.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {e.etiquette.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-neutral-600">
                Jadwal: {e.startsOn ? formatRentang(e.startsOn, e.endsOn ?? e.startsOn) : "tanggal belum pasti"} · {e.dateNote}
                {e.openTime && e.closeTime && ` · ${e.openTime}–${e.closeTime} WIB`}
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                Koordinat {e.lat}, {e.lng} · Rp {e.priceIdr.toLocaleString("id-ID")} ·{" "}
                {e.dailyQuota != null ? `kuota ${e.dailyQuota} orang/tanggal` : "tanpa pendaftaran"}
              </p>
              <VerifyButtons objectId={e.id} kind="event" />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
