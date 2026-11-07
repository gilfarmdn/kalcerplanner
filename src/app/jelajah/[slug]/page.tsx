import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import VisitRegistration from "@/components/VisitRegistration";
import { getSession } from "@/lib/auth";
import { ACTIVE_VISIT } from "@/lib/kuota";
import { dayString, toDay } from "@/lib/pelaku-api";
import { formatHariPanjang, hariIniJakarta } from "@/lib/tanggal";
import StatusBadge from "@/components/ui/StatusBadge";
import { depthInfo, formatRupiah, interestInfo, kindLabel, slotInfo, weekdayNames } from "@/lib/culture";
import { objectImage, VISIBLE_STATUSES } from "@/lib/culture-db";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  return prisma.culturalObject.findFirst({
    where: { slug, status: { in: [...VISIBLE_STATUSES] } },
    include: { events: { where: { isActive: true } } },
  });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const o = await load(params.slug);
    return { title: o ? `${o.name} — KalcerPlanner` : "Jelajah — KalcerPlanner", description: o?.summary };
  } catch {
    return { title: "Jelajah — KalcerPlanner" };
  }
}

export default async function ObjectPage({ params }: { params: { slug: string } }) {
  const o = await load(params.slug);
  if (!o) notFound();
  const session = await getSession();
  const today = hariIniJakarta();

  // Status pengguna untuk tempat ini: belum di rencana / di rencana (belum terdaftar) / terdaftar.
  const [visit, planned] = session
    ? await Promise.all([
        prisma.visit.findFirst({
          where: { userId: session.id, objectId: o.id, status: { in: [...ACTIVE_VISIT] }, visitDate: { gte: toDay(today) } },
          select: { id: true },
        }),
        prisma.tripItem.findMany({
          where: { objectId: o.id, trip: { userId: session.id } },
          select: { dayIndex: true, trip: { select: { startDate: true } } },
        }),
      ])
    : [null, []];
  const plannedDates = planned.map((p) => dayString(new Date(p.trip.startDate.getTime() + p.dayIndex * 86_400_000))).sort();
  const plannedDate = plannedDates.find((d) => d >= today) ?? plannedDates.at(-1) ?? null;

  const facts: [string, string][] = [
    ["Jenis", kindLabel[o.kind]],
    ["Lokasi", [o.zone, o.address].filter(Boolean).join(" · ")],
    ["Perkiraan tiket / orang", o.priceIdr === 0 ? "Gratis / donasi" : formatRupiah(o.priceIdr)],
    ["Lama kunjungan", `±${o.durationMin} menit`],
    ["Pengalaman", depthInfo[o.depth].label],
    ["Waktu yang cocok", o.slots.map((s) => slotInfo[s].label).join(", ")],
    ["Hari", o.weekdays.length ? o.weekdays.map((w) => weekdayNames[w]).join(", ") : "Setiap hari (perkiraan)"],
    ...(o.openTime && o.closeTime ? [["Jam", `${o.openTime}–${o.closeTime} WIB`] as [string, string]] : []),
  ];

  return (
    <SiteShell>
      <article className="mx-auto max-w-[1100px] px-4 pb-20 pt-10 sm:px-8">
        <Link href="/jelajah" className="text-sm text-brand-link underline">
          ← Semua objek budaya
        </Link>

        <div className="mt-4 grid gap-8 lg:grid-cols-[360px_1fr]">
          <div className="relative aspect-[305/350] overflow-hidden rounded-[10px] shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
            <Image src={objectImage(o)} alt={o.name} fill priority unoptimized sizes="360px" className="object-cover" />
          </div>

          <div>
            <p className="text-sm font-semibold text-brand-brown">{interestInfo[o.interest].label}</p>
            <h1 className="mt-1 font-serif text-3xl font-bold sm:text-[40px]">{o.name}</h1>
            <p className="mt-3 text-lg">{o.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={o.status} />
              {o.localRun && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">Dikelola pelaku setempat</span>}
              {o.hiddenGem && <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-900">Kurang padat pengunjung</span>}
            </div>

            <h2 className="mt-8 font-serif text-2xl font-bold">Mengapa ini penting</h2>
            <p className="mt-2 leading-relaxed">{o.meaning}</p>

            {o.etiquette.length > 0 && (
              <>
                <h2 className="mt-8 font-serif text-2xl font-bold">Etika berkunjung</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {o.etiquette.map((e) => (
                    <li key={e}>{e}</li>
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
            {o.scheduleNote && <p className="mt-3 rounded-[10px] border border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">{o.scheduleNote}</p>}

            {o.events.length > 0 && (
              <>
                <h2 className="mt-8 font-serif text-2xl font-bold">Event terkait</h2>
                <ul className="mt-2 space-y-2">
                  {o.events.map((e) => (
                    <li key={e.id} className="flex gap-3 rounded-[10px] border border-black bg-white p-3">
                      {e.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.imageUrl} alt={e.title} className="h-16 w-24 shrink-0 rounded object-cover" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold">{e.title}</p>
                        <p className="text-sm text-neutral-700">{e.dateNote}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h2 className="mt-8 font-serif text-2xl font-bold">Kunjunganmu</h2>
            {!session ? (
              <p className="mt-2 text-sm">
                <Link href={`/masuk?next=${encodeURIComponent(`/jelajah/${o.slug}`)}`} className="text-brand-link underline">
                  Masuk
                </Link>{" "}
                untuk melihat status dan mendaftarkan kunjunganmu.
              </p>
            ) : (
              <div className="mt-2">
                {!visit && (
                  <p>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${plannedDate ? "bg-amber-100 text-amber-900" : "bg-neutral-200 text-neutral-800"}`}
                    >
                      {plannedDate
                        ? `Di rencana${o.dailyQuota != null ? " (belum terdaftar)" : ""} – ${formatHariPanjang(plannedDate)}`
                        : "Belum di rencana"}
                    </span>
                  </p>
                )}
                {o.dailyQuota != null ? (
                  <VisitRegistration objectId={o.id} defaultDate={plannedDate && plannedDate >= today ? plannedDate : today} minDate={today} />
                ) : (
                  <p className="mt-2 text-sm text-neutral-700">Tempat ini tidak memerlukan pendaftaran kunjungan.</p>
                )}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href={`/rencana?minat=${o.interest}`} className="btn-primary">
                Masukkan ke rencanaku
              </Link>
              <p className="text-xs text-neutral-600">
                Harga, jam, dan jadwal dapat berubah. Konfirmasi ke pengelola sebelum berangkat.
              </p>
            </div>
          </div>
        </div>
      </article>
    </SiteShell>
  );
}
