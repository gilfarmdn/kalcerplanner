import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import SiteShell from "@/components/SiteShell";
import { requireUser } from "@/lib/auth";
import { badgeName, formatRupiah, INTERESTS, interestInfo } from "@/lib/culture";
import { objectImage, VISIBLE_STATUSES } from "@/lib/culture-db";
import { formatDay } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Jejak Budaya — KalcerPlanner" };
export const dynamic = "force-dynamic";

export default async function JejakPage() {
  const user = await requireUser("/jejak");

  const [stamps, totalObjects, impact] = await Promise.all([
    prisma.stamp.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { object: { select: { slug: true, name: true, zone: true, interest: true, imageUrl: true } } },
    }),
    prisma.culturalObject.count({ where: { status: { in: [...VISIBLE_STATUSES] } } }),
    prisma.trip.aggregate({ where: { userId: user.id }, _sum: { impactIdr: true }, _count: { _all: true } }),
  ]);

  const earned = new Set(stamps.map((s) => s.object.interest));
  const progress = totalObjects ? Math.round((stamps.length / totalObjects) * 100) : 0;

  return (
    <SiteShell>
      <DashboardShell heading={`Jejak Budaya ${user.name.split(" ")[0]}`}>
        <p className="max-w-2xl text-neutral-700">
          Paspor Budaya mencatat tempat yang benar-benar kamu datangi dan apa yang kamu pelajari di sana. Stempel dapat diklaim dari halaman detail rencana, mulai hari keberangkatan.
        </p>

        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[10px] border border-black bg-white p-4 text-center">
            <dt className="text-sm text-neutral-600">Stempel</dt>
            <dd className="text-3xl font-bold">
              {stamps.length} <span className="text-base font-medium text-neutral-600">/ {totalObjects}</span>
            </dd>
            <dd className="text-xs text-neutral-600">{progress}% paspor budaya</dd>
          </div>
          <div className="rounded-[10px] border border-black bg-white p-4 text-center">
            <dt className="text-sm text-neutral-600">Rencana tersimpan</dt>
            <dd className="text-3xl font-bold">{impact._count._all}</dd>
          </div>
          <div className="rounded-[10px] border border-black bg-white p-4 text-center">
            <dt className="text-sm text-neutral-600">Dialokasikan ke pelaku setempat</dt>
            <dd className="text-2xl font-bold">{formatRupiah(impact._sum.impactIdr ?? 0)}</dd>
            <dd className="text-xs text-neutral-600">dari semua rencanamu (perkiraan)</dd>
          </div>
        </dl>

        <h2 className="mt-10 font-serif text-2xl font-bold">Lencana</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INTERESTS.map((i) => {
            const has = earned.has(i);
            return (
              <li
                key={i}
                className={`rounded-[10px] border p-3 ${has ? "border-black bg-brand-mist/40" : "border-dashed border-neutral-400 text-neutral-500"}`}
              >
                <p className="font-semibold">{has ? badgeName[i] : "Belum diraih"}</p>
                <p className="text-sm">{interestInfo[i].label}</p>
              </li>
            );
          })}
        </ul>

        <h2 className="mt-10 font-serif text-2xl font-bold">Stempel</h2>
        {stamps.length === 0 ? (
          <p className="mt-3 text-neutral-700">
            Belum ada stempel. <Link href="/rencana" className="text-brand-link underline">Buat rencana</Link>, lalu klaim stempel setelah tiba di tempatnya.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {stamps.map((s) => (
              <li key={s.id} className="flex gap-4 rounded-[10px] border border-black bg-white p-3">
                <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-[5px]">
                  <Image src={objectImage(s.object)} alt="" fill unoptimized sizes="80px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  <Link href={`/jelajah/${s.object.slug}`} className="font-semibold hover:underline">
                    {s.object.name}
                  </Link>
                  <p className="text-xs text-neutral-600">
                    {s.object.zone} · {formatDay(s.createdAt)}
                  </p>
                  {s.note && <p className="mt-1 text-sm italic">“{s.note}”</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardShell>
    </SiteShell>
  );
}
