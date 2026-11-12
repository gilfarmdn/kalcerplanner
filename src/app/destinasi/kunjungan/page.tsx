import type { Metadata } from "next";
import PageHeading from "@/components/pelaku/PageHeading";
import VisitManager, { type VisitRow } from "@/components/pelaku/VisitManager";
import { requirePractitioner } from "@/lib/auth";
import { dayString, hariIniJakarta } from "@/lib/tanggal";
import { ownedEventWhere, ownedObjectWhere } from "@/lib/pelaku-api";
import { visitWhere } from "@/lib/pelaku-visits";
import { VISIT_STATUSES, visitStatusLabel } from "@/lib/pelaku-validators";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Riwayat Kunjungan — KalcerPlanner" };
export const dynamic = "force-dynamic";

type SP = { from?: string; to?: string; objectId?: string; eventId?: string; status?: string; q?: string };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function KunjunganPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const user = await requirePractitioner("/destinasi/kunjungan");
  const today = hariIniJakarta();

  // Tanpa filter tanggal sama sekali -> tampilkan hari ini. Bila parameter ada (walau kosong) -> pakai apa adanya.
  const hasDateParams = "from" in searchParams || "to" in searchParams;
  const sp: SP = {
    from: hasDateParams ? one(searchParams.from) : today,
    to: hasDateParams ? one(searchParams.to) : today,
    // Pilihan "Destinasi / event": nilai "o:<id>" atau "e:<id>". `objectId` lama (tautan dari halaman detail) tetap dikenali.
    ...(() => {
      const pick = one(searchParams.tujuan);
      if (pick?.startsWith("o:")) return { objectId: pick.slice(2) };
      if (pick?.startsWith("e:")) return { eventId: pick.slice(2) };
      return { objectId: one(searchParams.objectId), eventId: one(searchParams.eventId) };
    })(),
    status: one(searchParams.status),
    q: one(searchParams.q),
  };

  const [objects, events, visits] = await Promise.all([
    prisma.culturalObject.findMany({ where: ownedObjectWhere(user), orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.culturalEvent.findMany({
      where: { OR: [{ object: ownedObjectWhere(user) }, ownedEventWhere(user)] },
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

  // Kegiatan pada destinasi (punya objectId) = pilihan "kegiatan" di bawah destinasinya; event mandiri = tujuan tersendiri.
  const eventOptions = events.flatMap((e) => (e.objectId ? [{ id: e.id, title: e.title, objectId: e.objectId }] : []));
  const targets = [
    ...objects.map((o) => ({ value: `o:${o.id}`, label: o.name })),
    ...events.filter((e) => !e.objectId).map((e) => ({ value: `e:${e.id}`, label: `${e.title} (event)` })),
  ];
  const selectedTarget = sp.objectId ? `o:${sp.objectId}` : sp.eventId ? `e:${sp.eventId}` : "";
  const rows: VisitRow[] = visits.map((v) => ({
    id: v.id,
    objectId: v.objectId,
    objectName: v.object?.name ?? v.event?.title ?? "-",
    eventId: v.eventId,
    eventTitle: v.object ? (v.event?.title ?? null) : null,
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

      {targets.length === 0 ? (
        <p className="text-neutral-700">Tambahkan destinasi atau event terlebih dahulu agar kunjungan bisa dicatat.</p>
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
              Destinasi / event
              <select name="tujuan" defaultValue={selectedTarget} className="mt-1 select-arrow w-full rounded-lg border border-[#2c2c2c] px-2 py-1.5 text-sm">
                <option value="">Semua</option>
                {targets.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
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
              <a href="/destinasi/kunjungan"className="flex h-9 items-center text-sm text-brand-link underline">Hari ini</a>
            </div>
          </form>

          <p className="mb-4 text-sm">
            <strong>{active.length}</strong> pendaftaran · <strong>{totalPeople}</strong> orang · <strong>{attended}</strong> orang sudah hadir
            {visits.length === 300 && <span className="ml-2 text-xs text-neutral-600">(menampilkan 300 terbaru; persempit filter untuk melihat lainnya)</span>}
          </p>

          <VisitManager rows={rows} targets={targets} events={eventOptions} defaultDate={sp.from && sp.from === sp.to ? sp.from : today} exportHref={`/api/pelaku/visits/export?${exportQs.toString()}`} />
        </>
      )}
    </>
  );
}
