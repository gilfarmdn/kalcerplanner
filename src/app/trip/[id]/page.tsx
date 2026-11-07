import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import SiteShell from "@/components/SiteShell";
import { DeleteTripButton, StampButton } from "@/components/TripActions";
import StatusBadge from "@/components/ui/StatusBadge";
import VisitRegistration, { RegisterAll } from "@/components/VisitRegistration";
import { requireUser } from "@/lib/auth";
import { roleHome } from "@/lib/role-home";
import { pickSouvenirs } from "@/lib/content";
import { formatRupiah, kindLabel, slotInfo, styleLabel, weekdayNames } from "@/lib/culture";
import { formatHariPanjang, formatRentang, hariIniJakarta } from "@/lib/tanggal";
import { dayString } from "@/lib/pelaku-api";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const generateMetadata = (): Metadata => ({ title: "Detail Trip — KalcerPlanner" });
export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

export default async function TripDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser(`/trip/${params.id}`);
  if (user.role !== "TRAVELER") redirect(roleHome(user.role));

  const trip = await prisma.trip.findFirst({
    where: { id: params.id, userId: user.id },
    include: { items: { orderBy: { sortOrder: "asc" }, include: { object: true } } },
  });
  if (!trip) notFound();

  const stamps = await prisma.stamp.findMany({
    where: { userId: user.id, objectId: { in: trip.items.map((i) => i.objectId) } },
    select: { objectId: true },
  });
  const stamped = new Set(stamps.map((s) => s.objectId));
  const today = new Date(`${hariIniJakarta()}T00:00:00.000Z`);
  const started = trip.startDate <= today;

  const days = Math.round((trip.endDate.getTime() - trip.startDate.getTime()) / DAY_MS) + 1;
  const remaining = trip.budget !== null ? Math.max(0, trip.budget - trip.totalIdr) : null;
  const quotaItems = trip.items
    .filter((i) => i.object.dailyQuota != null)
    .map((i) => ({ objectId: i.objectId, name: i.object.name, date: dayString(new Date(trip.startDate.getTime() + i.dayIndex * DAY_MS)) }));
  const souvenirs = trip.includeSouvenir && remaining ? pickSouvenirs(remaining) : [];

  return (
    <SiteShell>
      <DashboardShell heading="Detail Perjalanan">
        <Link href="/trip" className="text-sm text-brand-link underline">
          ← Kembali ke My Trip
        </Link>
        <h2 className="mt-3 font-serif text-3xl font-bold">{trip.title.split(" · ")[0]} · {formatRentang(trip.startDate, trip.endDate)}</h2>
        <p className="mt-1 text-neutral-700">
          {formatRentang(trip.startDate, trip.endDate)} · {trip.adults} dewasa
          {trip.children ? `, ${trip.children} anak` : ""} ·{" "}
          gaya {((styleLabel as Record<string, string>)[trip.style] ?? trip.style).toLowerCase()}
        </p>

        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[10px] border border-black bg-white p-3 text-center">
            <dt className="text-sm text-neutral-600">Perkiraan total</dt>
            <dd className="text-xl font-semibold">{formatRupiah(trip.totalIdr)}</dd>
          </div>
          <div className="rounded-[10px] border border-black bg-white p-3 text-center">
            <dt className="text-sm text-neutral-600">Ke pelaku budaya setempat</dt>
            <dd className="text-xl font-semibold">{formatRupiah(trip.impactIdr)}</dd>
          </div>
          <div className="rounded-[10px] border border-black bg-white p-3 text-center">
            <dt className="text-sm text-neutral-600">{remaining === null ? "Anggaran" : "Sisa anggaran"}</dt>
            <dd className="text-xl font-semibold">{remaining === null ? "tidak diisi" : formatRupiah(remaining)}</dd>
          </div>
        </dl>

        {trip.notes.length > 0 && (
          <ul className="mt-5 space-y-1 rounded-[10px] border border-amber-500 bg-amber-50 p-4 text-sm text-amber-900">
            {trip.notes.map((n, i) => (
              <li key={i}>• {n}</li>
            ))}
          </ul>
        )}

        {quotaItems.length > 0 && (
          <div className="mt-6 flex flex-col items-start gap-2">
            <p className="text-sm text-neutral-700">
              Rencana ini belum mendaftarkan kunjungan. Daftarkan tempat berkuota agar pengelola menyiapkan tempat untukmu.
            </p>
            <RegisterAll items={quotaItems} defaultParty={trip.adults + trip.children} minDate={hariIniJakarta()} />
          </div>
        )}

        <div className="mt-8 space-y-8">
          {Array.from({ length: days }, (_, d) => {
            const items = trip.items.filter((i) => i.dayIndex === d);
            const date = new Date(trip.startDate.getTime() + d * DAY_MS);
            return (
              <section key={d}>
                <h3 className="font-serif text-2xl font-bold">
                  Hari {d + 1} <span className="text-lg font-medium text-neutral-600">· {formatHariPanjang(date)}</span>
                </h3>
                {items.length === 0 ? (
                  <p className="mt-2 text-sm text-neutral-600">Hari bebas.</p>
                ) : (
                  <ol className="mt-3 space-y-4">
                    {items.map((row) => {
                      const it = row;
                      return (
                      <li key={it.id} className="rounded-[10px] border border-black bg-white p-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-brand-brown">
                              {slotInfo[it.slot].label} ·{" "}
                          {it.object.isEvent && it.object.openTime ? it.object.openTime.replace(":", ".") : slotInfo[it.slot].start}
                            </p>
                            <Link href={`/jelajah/${it.object.slug}`} className="text-xl font-semibold hover:underline">
                              {it.object.name}
                            </Link>
                            <p className="text-sm text-neutral-600">
                              {kindLabel[it.object.kind]} · {it.object.zone}
                            </p>
                          </div>
                          <p className="text-lg font-semibold">{it.priceIdr === 0 ? "Gratis" : formatRupiah(it.priceIdr)}</p>
                        </div>

                        <ul className="mt-3 flex flex-wrap gap-2">
                          {it.reasons.map((r) => (
                            <li key={r} className="rounded-full bg-brand-mist/40 px-3 py-1 text-xs">
                              {r}
                            </li>
                          ))}
                        </ul>

                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-semibold text-brand-link">Mengapa ini penting & etika berkunjung</summary>
                          <p className="mt-2 text-sm">{it.object.meaning}</p>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                            {it.object.etiquette.map((e) => (
                              <li key={e}>{e}</li>
                            ))}
                          </ul>
                          {it.object.scheduleNote && <p className="mt-2 text-sm text-amber-800">Jadwal: {it.object.scheduleNote}</p>}
                          {it.object.weekdays.length > 0 && (
                            <p className="mt-1 text-sm text-neutral-700">Hari: {it.object.weekdays.map((w) => weekdayNames[w]).join(", ")}</p>
                          )}
                          <div className="mt-2">
                            <StatusBadge status={it.object.status} />
                          </div>
                        </details>

                        {it.object.dailyQuota != null && (
                          <VisitRegistration
                            objectId={it.objectId}
                            defaultDate={dayString(date)}
                            defaultParty={trip.adults + trip.children}
                            minDate={hariIniJakarta()}
                          />
                        )}

                        <div className="mt-3">
                          {stamped.has(it.objectId) ? (
                            <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-900">✓ Stempel terklaim</span>
                          ) : started ? (
                            <StampButton objectId={it.objectId} />
                          ) : (
                            <span className="text-xs text-neutral-500">Stempel dapat diklaim mulai hari keberangkatan.</span>
                          )}
                        </div>
                      </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            );
          })}
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse border-2 border-black bg-white text-base">
            <caption className="bg-neutral-100 p-2 text-left font-semibold">Rincian perkiraan biaya</caption>
            <tbody>
              {(
                [
                  ["Tiket & kelas budaya", trip.costTickets],
                  ["Makan (estimasi)", trip.costMeals],
                  ["Transportasi lokal (estimasi)", trip.costLocal],
                  ["Penginapan (estimasi)", trip.costLodging],
                ] as const
              ).map(([label, value]) => (
                <tr key={label}>
                  <td className="border border-black px-3 py-2">{label}</td>
                  <td className="border border-black px-3 py-2 text-right">{formatRupiah(value)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="border border-black px-3 py-2">Total</td>
                <td className="border border-black px-3 py-2 text-right">{formatRupiah(trip.totalIdr)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {souvenirs.length > 0 && (
          <div className="mt-8">
            <h3 className="font-serif text-2xl font-bold">Sisa {formatRupiah(remaining ?? 0)} untuk Oleh-oleh</h3>
            <ul className="mt-3 grid gap-3 sm:grid-cols-3">
              {souvenirs.map((s) => (
                <li key={s.id} className="rounded-[10px] border border-black bg-white p-3">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-neutral-600">
                    {s.umkm} · {formatRupiah(s.price)}
                  </p>
                  <p className="mt-1 text-sm">{s.story}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-8 text-xs text-neutral-600">
          Biaya adalah perkiraan dan jadwal/harga tempat dapat berubah. Konfirmasi ke pengelola sebelum berangkat. KalcerPlanner tidak memproses pembayaran.
        </p>
        <div className="mt-4">
          <DeleteTripButton tripId={trip.id} />
        </div>
      </DashboardShell>
    </SiteShell>
  );
}
