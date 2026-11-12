import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import VisitRegistration from "@/components/VisitRegistration";
import StatusBadge from "@/components/ui/StatusBadge";
import { getSession } from "@/lib/auth";
import { formatRupiah, interestInfo, weekdayNames } from "@/lib/culture";
import { objectImage, plannableEvent } from "@/lib/culture-db";
import { ACTIVE_VISIT } from "@/lib/kuota";
import { prisma } from "@/lib/prisma";
import { dayString, formatHariPanjang, formatRentang, hariIniJakarta, toDay } from "@/lib/tanggal";

export const dynamic = "force-dynamic";

/** Event mandiri (tabel CulturalEvent) yang sudah diverifikasi. */
async function load(slug: string) {
  return prisma.culturalEvent.findFirst({ where: { slug, ...plannableEvent } });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const e = await load(params.slug);
    return { title: e ? `${e.title} — KalcerPlanner` : "Jelajah — KalcerPlanner", description: e?.description };
  } catch {
    return { title: "Jelajah — KalcerPlanner" };
  }
}

function scheduleText(e: { startsOn: Date | null; endsOn: Date | null; repeatsYearly: boolean; weekdays: number[]; dateNote: string }) {
  if (!e.startsOn) return e.dateNote;
  const range = formatRentang(e.startsOn, e.endsOn ?? e.startsOn);
  if (e.weekdays.length > 0) {
    const days = e.weekdays.map((w) => weekdayNames[w]).join(", ");
    return `Setiap ${days}, ${e.endsOn ? `${range}` : `mulai ${formatHariPanjang(e.startsOn)}`}`;
  }
  return e.repeatsYearly ? `${range} (berulang setiap tahun)` : range;
}

export default async function EventPage({ params }: { params: { slug: string } }) {
  const e = await load(params.slug);
  if (!e) notFound();
  const session = await getSession();
  const today = hariIniJakarta();

  // Status pengguna untuk event ini: belum di rencana / di rencana (belum terdaftar) / terdaftar.
  const [visit, planned] = session
    ? await Promise.all([
        prisma.visit.findFirst({
          where: { userId: session.id, eventId: e.id, status: { in: [...ACTIVE_VISIT] }, visitDate: { gte: toDay(today) } },
          select: { id: true },
        }),
        prisma.tripItem.findMany({
          where: { eventId: e.id, trip: { userId: session.id } },
          select: { dayIndex: true, trip: { select: { startDate: true } } },
        }),
      ])
    : [null, []];
  const plannedDates = planned.map((p) => dayString(new Date(p.trip.startDate.getTime() + p.dayIndex * 86_400_000))).sort();
  const plannedDate = plannedDates.find((d) => d >= today) ?? plannedDates.at(-1) ?? null;

  const facts: [string, string][] = [
    ["Jenis", "Event budaya"],
    ["Jadwal", scheduleText(e)],
    ...(e.openTime && e.closeTime ? [["Jam", `${e.openTime}–${e.closeTime} WIB`] as [string, string]] : []),
    ["Lokasi", [e.zone, e.address].filter(Boolean).join(" · ")],
    ["Perkiraan tiket / orang", e.priceIdr === 0 ? "Gratis / donasi" : formatRupiah(e.priceIdr)],
  ];

  return (
    <SiteShell>
      <article className="mx-auto max-w-[1100px] px-4 pb-20 pt-10 sm:px-8">
        <Link href="/jelajah" className="text-sm text-brand-link underline">
          ← Semua objek budaya
        </Link>

        <div className="mt-4 grid gap-8 lg:grid-cols-[360px_1fr]">
          <div className="relative aspect-[305/350] overflow-hidden rounded-[10px] shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
            <Image src={objectImage(e)} alt={e.title} fill priority unoptimized sizes="360px" className="object-cover" />
          </div>

          <div>
            <p className="text-sm font-semibold text-brand-brown">
              Event · {e.interest ? interestInfo[e.interest].label : "Budaya"}
            </p>
            <h1 className="mt-1 font-serif text-3xl font-bold sm:text-[40px]">{e.title}</h1>
            <p className="mt-3 text-lg">{e.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={e.status} />
              {e.localRun && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">Dikelola pelaku setempat</span>}
              {e.hiddenGem && <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-900">Kurang padat pengunjung</span>}
            </div>

            {e.meaning && (
              <>
                <h2 className="mt-8 font-serif text-2xl font-bold">Mengapa ini penting</h2>
                <p className="mt-2 leading-relaxed">{e.meaning}</p>
              </>
            )}

            {e.etiquette.length > 0 && (
              <>
                <h2 className="mt-8 font-serif text-2xl font-bold">Etika menghadiri acara</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {e.etiquette.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </>
            )}

            <h2 className="mt-8 font-serif text-2xl font-bold">Info praktis</h2>
            <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-[200px_1fr]">
              {facts.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-neutral-600">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {e.scheduleNote && <p className="mt-3 rounded-[10px] border border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">{e.scheduleNote}</p>}

            <h2 className="mt-8 font-serif text-2xl font-bold">Kunjunganmu</h2>
            {!session ? (
              <p className="mt-2 text-sm">
                <Link href={`/masuk?next=${encodeURIComponent(`/jelajah/event/${e.slug}`)}`} className="text-brand-link underline">
                  Masuk
                </Link>{" "}
                untuk melihat status dan mendaftarkan kehadiranmu.
              </p>
            ) : (
              <div className="mt-2">
                {!visit && (
                  <p>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${plannedDate ? "bg-amber-100 text-amber-900" : "bg-neutral-200 text-neutral-800"}`}
                    >
                      {plannedDate
                        ? `Di rencana${e.dailyQuota != null ? " (belum terdaftar)" : ""} – ${formatHariPanjang(plannedDate)}`
                        : "Belum di rencana"}
                    </span>
                  </p>
                )}
                {e.dailyQuota != null ? (
                  <VisitRegistration eventId={e.id} defaultDate={plannedDate && plannedDate >= today ? plannedDate : today} minDate={today} />
                ) : (
                  <p className="mt-2 text-sm text-neutral-700">Event ini tidak memerlukan pendaftaran.</p>
                )}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-4">
              {e.interest && (
                <Link href={`/rencana?minat=${e.interest}`} className="btn-primary">
                  Masukkan ke rencanaku
                </Link>
              )}
              <p className="text-xs text-neutral-600">Harga, jam, dan jadwal dapat berubah. Konfirmasi ke penyelenggara sebelum berangkat.</p>
            </div>
          </div>
        </div>
      </article>
    </SiteShell>
  );
}
