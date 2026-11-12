import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteDestinationButton from "@/components/pelaku/DeleteDestinationButton";
import PageHeading from "@/components/pelaku/PageHeading";
import StatusPill from "@/components/pelaku/StatusPill";
import ObjectForm from "@/components/ObjectForm";
import { requirePractitioner } from "@/lib/auth";
import { interestInfo } from "@/lib/culture";
import { dayString, formatRentang, toDay, hariIniJakarta } from "@/lib/tanggal";
import { ownedEventWhere } from "@/lib/pelaku-api";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Detail Event — KalcerPlanner" };
export const dynamic = "force-dynamic";

/** Detail dan pengelolaan event budaya mandiri (tabel CulturalEvent) milik pelaku. */
export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePractitioner(`/destinasi/event/${params.id}`);
  const event = await prisma.culturalEvent.findFirst({ where: { id: params.id, ...ownedEventWhere(user) } });
  if (!event) notFound();

  const today = toDay(hariIniJakarta());
  const [upcoming, total] = await Promise.all([
    prisma.visit.aggregate({
      where: { eventId: event.id, visitDate: { gte: today }, status: { not: "CANCELLED" } },
      _sum: { partySize: true },
    }),
    prisma.visit.count({ where: { eventId: event.id } }),
  ]);

  const isPublic = event.status === "VERIFIED" || event.status === "SEED";
  const recurrence = event.weekdays.length > 0 ? "WEEKLY" : event.repeatsYearly ? "YEARLY" : "ONCE";

  return (
    <>
      <PageHeading title="Detail Event" />

      <div className="max-w-3xl space-y-10">
        <section className="overflow-hidden rounded-md shadow-[0_3px_6px_rgba(0,0,0,0.25)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.imageUrl || `/api/placeholder/${event.slug}`} alt={event.title} className="h-48 w-full object-cover sm:h-64" />
          <div className="space-y-2 bg-white p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold">{event.title}</h2>
              <StatusPill status={event.status} />
            </div>
            <p className="text-sm text-neutral-600">
              Event · {event.interest ? interestInfo[event.interest].label : "—"} · {event.zone}
              {event.address ? ` · ${event.address}` : ""}
            </p>
            <p className="text-sm text-neutral-600">
              {event.startsOn ? formatRentang(event.startsOn, event.endsOn ?? event.startsOn) : event.dateNote}
              {event.openTime && event.closeTime ? ` · ${event.openTime}–${event.closeTime} WIB` : ""}
            </p>
            <p className="text-sm">{event.description}</p>
            {event.status === "PENDING" && (
              <p className="rounded bg-amber-50 p-2 text-xs text-amber-900">Event ini belum tampil untuk wisatawan. Kurator akan memeriksanya terlebih dahulu.</p>
            )}
            {event.status === "REJECTED" && (
              <p className="rounded bg-red-50 p-2 text-xs text-red-900">Pengajuan ditolak kurator. Perbaiki data lalu simpan untuk diajukan ulang.</p>
            )}
            <div className="flex flex-wrap gap-4 pt-2 text-sm">
              {isPublic && (
                <Link href={`/jelajah/event/${event.slug}`} className="text-brand-link underline">
                  Lihat halaman publik
                </Link>
              )}
              <Link href={`/destinasi/kunjungan?eventId=${event.id}&from=&to=`} className="text-brand-link underline">
                Riwayat kunjungan ({total})
              </Link>
            </div>
            <p className="text-xs text-neutral-600">Peserta terdaftar mulai hari ini: {upcoming._sum.partySize ?? 0} orang</p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Ubah data event</h2>
          {event.status !== "PENDING" && (
            <p className="mb-3 text-xs text-neutral-600">Setelah disimpan, perubahan akan dicek ulang kurator sebelum tampil kembali.</p>
          )}
          <ObjectForm
            event={{
              id: event.id,
              name: event.title,
              interest: event.interest ?? "ADAT_RITUS",
              zone: event.zone ?? "",
              lat: event.lat ?? 0,
              lng: event.lng ?? 0,
              summary: event.description,
              meaning: event.meaning ?? "",
              etiquette: event.etiquette,
              priceIdr: event.priceIdr,
              childPriceIdr: event.childPriceIdr,
              dailyQuota: event.dailyQuota,
              openTime: event.openTime,
              closeTime: event.closeTime,
              scheduleNote: event.scheduleNote,
              imageUrl: event.imageUrl,
              startsOn: event.startsOn ? dayString(event.startsOn) : "",
              endsOn: event.endsOn ? dayString(event.endsOn) : "",
              recurrence,
              weekdays: event.weekdays,
              exceptDates: event.exceptDates,
            }}
          />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-red-800">Zona berbahaya</h2>
          <DeleteDestinationButton id={event.id} name={event.title} kind="event" />
        </section>
      </div>
    </>
  );
}
