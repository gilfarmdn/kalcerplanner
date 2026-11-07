import type { Metadata } from "next";
import PageHeading from "@/components/pelaku/PageHeading";
import VisitManager, { type VisitRow } from "@/components/pelaku/VisitManager";
import { requirePractitioner } from "@/lib/auth";
import { dayString, ownedObjectWhere } from "@/lib/pelaku-api";
import { visitWhere } from "@/lib/pelaku-visits";
import { VISIT_STATUSES, visitStatusLabel } from "@/lib/pelaku-validators";
import { prisma } from "@/lib/prisma";
import { hariIniJakarta } from "@/lib/tanggal";

export const metadata: Metadata = { title: "Riwayat Kunjungan — KalcerPlanner" };
export const dynamic = "force-dynamic";

type SP = { from?: string; to?: string; objectId?: string; status?: string; q?: string };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function KunjunganPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const user = await requirePractitioner("/pelaku/kunjungan");
  const today = hariIniJakarta();

  // Tanpa filter tanggal sama sekali -> tampilkan hari ini. Bila parameter ada (walau kosong) -> pakai apa adanya.
  const hasDateParams = "from" in searchParams || "to" in searchParams;
  const sp: SP = {
    from: hasDateParams ? one(searchParams.from) : today,
    to: hasDateParams ? one(searchParams.to) : today,
    objectId: one(searchParams.objectId),
    status: one(searchParams.status),
    q: one(searchParams.q),
  };

  const [objects, events, visits] = await Promise.all([
    prisma.culturalObject.findMany({ where: ownedObjectWhere(user), orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.culturalEvent.findMany({
      where: { object: ownedObjectWhere(user) },
      orderBy: { title: "asc" },
      select: { id: true, title: true, objectId: true },
    }),
    prisma.visit.findMany({
      where: visitWhere(user, sp),
      orderBy: [{ visitDate: "desc" }, { createdAt: "desc" }],
      take: 300,
      include: { object: { select: { name: true } }, event: { select: { title: true } } },
    }),
  ]);

  const eventOptions = events.flatMap((e) => (e.objectId ? [{ id: e.id, title: e.title, objectId: e.objectId }] : []));
  const rows: VisitRow[] = visits.map((v) => ({
    id: v.id,
    objectId: v.objectId,
    objectName: v.object.name,
    eventId: v.eventId,
    eventTitle: v.event?.title ?? null,
    visitorName: v.visitorName,
    contact: v.contact ?? "",
    partySize: v.partySize,
    visitDate: dayString(v.visitDate),
    status: v.status,
    source: v.source,
    note: v.note ?? "",
  }));

  const active = rows.filter((r) => r.status !== "CANCELLED");
  const totalPeople = active.reduce((n, r) => n + r.partySize, 0);
  const attended = rows.filter((r) => r.status === "ATTENDED").reduce((n, r) => n + r.partySize, 0);

  const exportQs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v) exportQs.set(k, v);

  return (
    <>
      <PageHeading title="Riwayat Kunjungan" />

      {objects.length === 0 ? (
        <p className="text-neutral-700">Tambahkan destinasi terlebih dahulu agar kunjungan bisa dicatat.</p>
      ) : (
        <>
          <form method="get" className="mb-6 grid max-w-4xl gap-3 rounded-lg border border-neutral-300 p-4 sm:grid-cols-2 lg:grid-cols-6">
            <label className="text-xs font-medium">
              Dari tanggal
              <input name="from" type="date" defaultValue={sp.from ?? ""} className="mt-1 w-full rounded-lg border border-[#2c2c2c] px-2 py-1.5 text-sm" />
            </label>
            <label className="text-xs font-medium">
              Sampai tanggal
              <input name="to" type="date" defaultValue={sp.to ?? ""} className="mt-1 w-full rounded-lg border border-[#2c2c2c] px-2 py-1.5 text-sm" />
            </label>
            <label className="text-xs font-medium">
              Destinasi
              <select name="objectId" defaultValue={sp.objectId ?? ""} className="mt-1 select-arrow w-full rounded-lg border border-[#2c2c2c] px-2 py-1.5 text-sm">
                <option value="">Semua</option>
                {objects.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium">
              Status
              <select name="status" defaultValue={sp.status ?? ""} className="mt-1 select-arrow w-full rounded-lg border border-[#2c2c2c] px-2 py-1.5 text-sm">
                <option value="">Semua</option>
                {VISIT_STATUSES.map((s) => (
                  <option key={s} value={s}>{visitStatusLabel[s]}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium">
              Cari nama / kontak
              <input name="q" defaultValue={sp.q ?? ""} className="mt-1 w-full rounded-lg border border-[#2c2c2c] px-2 py-1.5 text-sm" />
            </label>
            <div className="flex items-end gap-2">
              <button type="submit" className="h-9 rounded-lg bg-brand-green px-4 text-sm text-white hover:brightness-110">Terapkan</button>
              <a href="/pelaku/kunjungan" className="flex h-9 items-center text-sm text-brand-link underline">Hari ini</a>
            </div>
          </form>

          <p className="mb-4 text-sm">
            <strong>{active.length}</strong> pendaftaran · <strong>{totalPeople}</strong> orang · <strong>{attended}</strong> orang sudah hadir
            {visits.length === 300 && <span className="ml-2 text-xs text-neutral-600">(menampilkan 300 terbaru; persempit filter untuk melihat lainnya)</span>}
          </p>

          <VisitManager rows={rows} objects={objects} events={eventOptions} defaultDate={sp.from && sp.from === sp.to ? sp.from : today} exportHref={`/api/pelaku/visits/export?${exportQs.toString()}`} />
        </>
      )}
    </>
  );
}
