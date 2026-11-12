import type { Metadata } from "next";
import EventCalendar from "@/components/EventCalendar";
import SiteShell from "@/components/SiteShell";
import { EVENT_HREF, VISIBLE_STATUSES, plannableEvent, visibleEvent } from "@/lib/culture-db";
import type { CalEvent } from "@/lib/kalender";
import { prisma } from "@/lib/prisma";
import { hariIniJakarta } from "@/lib/tanggal";

export const metadata: Metadata = { title: "Kalender Budaya — KalcerPlanner" };
export const dynamic = "force-dynamic";

const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export default async function KalenderPage() {
  // Kalender hanya membaca tabel CulturalEvent. Jadwal rutin (mis. pentas mingguan) disimpan sebagai event berulang
  // (kolom weekdays) yang terhubung ke objeknya, bukan dihitung dari CulturalObject.
  const [rawEvents, zoneRows] = await Promise.all([
    prisma.culturalEvent.findMany({
      where: { isActive: true, ...visibleEvent },
      include: { object: { select: { slug: true, name: true, address: true, zone: true } } },
      orderBy: { title: "asc" },
    }),
    prisma.culturalObject.findMany({
      where: { status: { in: [...VISIBLE_STATUSES] } },
      distinct: ["zone"],
      select: { zone: true },
      orderBy: { zone: "asc" },
    }),
  ]);
  const standalone = new Set(
    (await prisma.culturalEvent.findMany({ where: plannableEvent, select: { id: true } })).map((e) => e.id),
  );

  const events: CalEvent[] = rawEvents.map((e) => ({
    id: e.id,
    title: e.title,
    zone: e.zone ?? e.object?.zone ?? "",
    description: e.description,
    // Lokasi: isian khusus event bila ada, kalau tidak nama + alamat objek terkait.
    location: e.venue ?? e.address ?? (e.object ? [e.object.name, e.object.address].filter(Boolean).join(", ") : null),
    objectSlug: e.object?.slug ?? null,
    // Event mandiri punya halaman detail sendiri; catatan kalender menautkan ke destinasinya (bila ada).
    href: standalone.has(e.id) ? EVENT_HREF(e.slug) : e.object?.slug ? `/jelajah/${e.object.slug}` : null,
    startsOn: ymd(e.startsOn),
    endsOn: ymd(e.endsOn),
    repeatsYearly: e.repeatsYearly,
    weekdays: e.weekdays,
    exceptDates: e.exceptDates,
    monthHint: e.monthHint,
    dateNote: e.dateNote,
    imageUrl: e.imageUrl,
  }));

  return (
    <SiteShell>
      <div className="mx-auto max-w-[1100px] px-4 pb-20 pt-12 sm:px-8">
        <h1 className="font-serif text-3xl font-bold sm:text-[40px]">Kalender Budaya</h1>
        <p className="mt-3 max-w-2xl text-neutral-700">
          Pilih tanggal untuk melihat kegiatan budaya yang sedang berlangsung
        </p>
        <div className="mt-8">
          <EventCalendar events={events} zones={zoneRows.map((r) => r.zone)} today={hariIniJakarta()} />
        </div>
      </div>
    </SiteShell>
  );
}
