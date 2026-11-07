import type { Metadata } from "next";
import EventCalendar from "@/components/EventCalendar";
import SiteShell from "@/components/SiteShell";
import { VISIBLE_STATUSES, visibleEvent } from "@/lib/culture-db";
import type { CalEvent, CalShow } from "@/lib/kalender";
import { prisma } from "@/lib/prisma";
import { hariIniJakarta } from "@/lib/tanggal";

export const metadata: Metadata = { title: "Kalender Budaya — KalcerPlanner" };
export const dynamic = "force-dynamic";

const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export default async function KalenderPage() {
  const [rawEvents, rawShows, zoneRows] = await Promise.all([
    prisma.culturalEvent.findMany({
      where: { isActive: true, ...visibleEvent },
      include: { object: { select: { slug: true, name: true, address: true, zone: true } } },
      orderBy: { title: "asc" },
    }),
    prisma.culturalObject.findMany({
      where: { status: { in: [...VISIBLE_STATUSES] }, kind: "PERTUNJUKAN", isEvent: false },
      orderBy: { name: "asc" },
      select: { slug: true, name: true, summary: true, scheduleNote: true, address: true, zone: true, weekdays: true },
    }),
    prisma.culturalObject.findMany({
      where: { status: { in: [...VISIBLE_STATUSES] } },
      distinct: ["zone"],
      select: { zone: true },
      orderBy: { zone: "asc" },
    }),
  ]);

  const events: CalEvent[] = rawEvents.map((e) => ({
    id: e.id,
    title: e.title,
    zone: e.zone ?? e.object?.zone ?? "",
    description: e.description,
    // Lokasi: isian khusus event bila ada, kalau tidak nama + alamat objek terkait.
    location: e.venue ?? (e.object ? [e.object.name, e.object.address].filter(Boolean).join(", ") : null),
    objectSlug: e.object?.slug ?? null,
    startsOn: ymd(e.startsOn),
    endsOn: ymd(e.endsOn),
    repeatsYearly: e.repeatsYearly,
    weekdays: e.weekdays,
    exceptDates: e.exceptDates,
    monthHint: e.monthHint,
    dateNote: e.dateNote,
    imageUrl: e.imageUrl,
  }));

  // Hanya pertunjukan yang punya hari tampil yang bisa ditempatkan pada tanggal tertentu.
  const shows: CalShow[] = rawShows
    .filter((s) => s.weekdays.length > 0)
    .map((s) => ({
      slug: s.slug,
      name: s.name,
      zone: s.zone,
      description: [s.summary, s.scheduleNote].filter(Boolean).join(" "),
      location: s.address ? `${s.name}, ${s.address}` : s.name,
      weekdays: s.weekdays,
    }));

  return (
    <SiteShell>
      <div className="mx-auto max-w-[1100px] px-4 pb-20 pt-12 sm:px-8">
        <h1 className="font-serif text-3xl font-bold sm:text-[40px]">Kalender Budaya</h1>
        <p className="mt-3 max-w-2xl text-neutral-700">
          Pilih tanggal untuk melihat kegiatan budaya yang sedang berlangsung
        </p>
        <div className="mt-8">
          <EventCalendar events={events} shows={shows} zones={zoneRows.map((r) => r.zone)} today={hariIniJakarta()} />
        </div>
      </div>
    </SiteShell>
  );
}
