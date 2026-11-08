import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteDestinationButton from "@/components/pelaku/DeleteDestinationButton";
import EventManager, { type EventRow } from "@/components/pelaku/EventManager";
import PageHeading from "@/components/pelaku/PageHeading";
import StatusPill from "@/components/pelaku/StatusPill";
import ObjectForm from "@/components/ObjectForm";
import { requirePractitioner } from "@/lib/auth";
import { interestInfo, kindLabel } from "@/lib/culture";
import { dayString, toDay, hariIniJakarta } from "@/lib/tanggal";
import { ownedObjectWhere } from "@/lib/pelaku-api";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Detail Destinasi — KalcerPlanner" };
export const dynamic = "force-dynamic";

export default async function DestinasiDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePractitioner(`/destinasi/${params.id}`);
  const object = await prisma.culturalObject.findFirst({
    where: { id: params.id, ...ownedObjectWhere(user) },
    include: { events: { orderBy: { startsOn: "desc" } } },
  });
  if (!object) notFound();

  const today = toDay(hariIniJakarta());
  const [upcoming, total] = await Promise.all([
    prisma.visit.aggregate({
      where: { objectId: object.id, visitDate: { gte: today }, status: { not: "CANCELLED" } },
      _sum: { partySize: true },
    }),
    prisma.visit.count({ where: { objectId: object.id } }),
  ]);

  const events: EventRow[] = object.events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    startsOn: e.startsOn ? dayString(e.startsOn) : "",
    endsOn: e.endsOn ? dayString(e.endsOn) : "",
    repeatsYearly: e.repeatsYearly,
    weekdays: e.weekdays,
    exceptDates: e.exceptDates,
    venue: e.venue ?? "",
    imageUrl: e.imageUrl,
    isActive: e.isActive,
  }));
  const isPublic = object.status === "VERIFIED" || object.status === "SEED";

  return (
    <>
      <PageHeading title="Detail Destinasi" />

      <div className="max-w-3xl space-y-10">
        <section className="overflow-hidden rounded-md shadow-[0_3px_6px_rgba(0,0,0,0.25)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={object.imageUrl || `/api/placeholder/${object.slug}`} alt={object.name} className="h-48 w-full object-cover sm:h-64" />
          <div className="space-y-2 bg-white p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold">{object.name}</h2>
              <StatusPill status={object.status} />
            </div>
            <p className="text-sm text-neutral-600">
              {kindLabel[object.kind]} · {interestInfo[object.interest].label} · {object.zone}
              {object.address ? ` · ${object.address}` : ""}
            </p>
            <p className="text-sm">{object.summary}</p>
            {object.status === "PENDING" && (
              <p className="rounded bg-amber-50 p-2 text-xs text-amber-900">Destinasi ini belum tampil untuk wisatawan. Kurator akan memeriksanya terlebih dahulu.</p>
            )}
            {object.status === "REJECTED" && (
              <p className="rounded bg-red-50 p-2 text-xs text-red-900">Pengajuan ditolak kurator. Perbaiki data lalu simpan untuk diajukan ulang.</p>
            )}
            <div className="flex flex-wrap gap-4 pt-2 text-sm">
              {isPublic && (
                <Link href={`/jelajah/${object.slug}`} className="text-brand-link underline">
                  Lihat halaman publik
                </Link>
              )}
              <Link href={`/destinasi/kunjungan?objectId=${object.id}&from=&to=`} className="text-brand-link underline">
                Riwayat kunjungan ({total})
              </Link>
            </div>
            <p className="text-xs text-neutral-600">Pengunjung terdaftar mulai hari ini: {upcoming._sum.partySize ?? 0} orang</p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Event budaya ({events.length})</h2>
          <EventManager objectId={object.id} events={events} />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Ubah data destinasi</h2>
          {object.status !== "PENDING" && (
            <p className="mb-3 text-xs text-neutral-600">Setelah disimpan, perubahan akan dicek ulang kurator sebelum tampil kembali.</p>
          )}
          <ObjectForm
            object={{
              id: object.id,
              name: object.name,
              kind: object.kind,
              interest: object.interest,
              zone: object.zone,
              address: object.address,
              lat: object.lat,
              lng: object.lng,
              summary: object.summary,
              meaning: object.meaning,
              etiquette: object.etiquette,
              priceIdr: object.priceIdr,
              childPriceIdr: object.childPriceIdr,
              dailyQuota: object.dailyQuota,
              durationMin: object.durationMin,
              depth: object.depth,
              slots: object.slots,
              weekdays: object.weekdays,
              openTime: object.openTime,
              closeTime: object.closeTime,
              scheduleNote: object.scheduleNote,
              imageUrl: object.imageUrl,
            }}
          />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-red-800">Zona berbahaya</h2>
          <DeleteDestinationButton id={object.id} name={object.name} />
        </section>
      </div>
    </>
  );
}
