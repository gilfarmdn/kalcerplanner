import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import PageHeading from "@/components/pelaku/PageHeading";
import StatusPill from "@/components/pelaku/StatusPill";
import { requirePractitioner } from "@/lib/auth";
import { ownedObjectWhere, toDay } from "@/lib/pelaku-api";
import { prisma } from "@/lib/prisma";
import { hariIniJakarta } from "@/lib/tanggal";

export const metadata: Metadata = { title: "My Destination — KalcerPlanner" };
export const dynamic = "force-dynamic";

export default async function PelakuHomePage() {
  const user = await requirePractitioner("/destinasi");
  const owned = ownedObjectWhere(user);
  const today = toDay(hariIniJakarta());

  const [destinations, todayVisits, activeEvents] = await Promise.all([
    prisma.culturalObject.findMany({
      where: owned,
      orderBy: { createdAt: "desc" },
      select: { id: true, slug: true, name: true, zone: true, status: true, imageUrl: true, isEvent: true },
    }),
    prisma.visit.aggregate({
      where: { object: owned, visitDate: today, status: { not: "CANCELLED" } },
      _sum: { partySize: true },
      _count: true,
    }),
    prisma.culturalEvent.count({ where: { object: owned, isActive: true } }),
  ]);

  return (
    <>
      <PageHeading title="Selamat datang kembali" name={user.name} />

      <Link
        href="/destinasi/tambah"
        className="flex h-[108px] max-w-[275px] items-center justify-center gap-3 rounded-md bg-brand-green px-6 text-lg text-white transition hover:brightness-110 sm:ml-4"
      >
        <Briefcase size={32} aria-hidden />
        Tambah Destinasi Wisata
      </Link>

      <dl className="mt-6 grid max-w-[640px] grid-cols-3 gap-3 sm:ml-4">
        <Stat label="Destinasi" value={destinations.filter((d) => !d.isEvent).length} />
        <Stat label="Event aktif" value={activeEvents} />
        <Stat label="Pengunjung hari ini" value={todayVisits._sum.partySize ?? 0} href="/destinasi/kunjungan" />
      </dl>

      <Section title="Destinasi Wisata" items={destinations.filter((d) => !d.isEvent)} empty="Belum ada destinasi. Klik “Tambah Destinasi Wisata” untuk memulai." />
      <Section title="Event Budaya" items={destinations.filter((d) => d.isEvent)} empty="Belum ada event. Pilih “Event Budaya” saat menambah." />
    </>
  );
}

type DestinationItem = {
  id: string;
  slug: string;
  name: string;
  zone: string;
  status: string;
  imageUrl: string | null;
};

function Section({ title, items, empty }: { title: string; items: DestinationItem[]; empty: string }) {
  return (
    <>
      <h2 className="mb-5 mt-10 text-lg font-semibold sm:ml-4">{title}</h2>
      {items.length === 0 ? (
        <p className="text-neutral-700 sm:ml-4">{empty}</p>
      ) : (
        <ul className="grid gap-6 sm:ml-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((d) => (
            <li key={d.id} className="overflow-hidden rounded-md shadow-[0_3px_6px_rgba(0,0,0,0.25)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.imageUrl || `/api/placeholder/${d.slug}`} alt={d.name} className="h-36 w-full object-cover sm:h-44" />
              <div className="flex flex-col items-center gap-2 bg-white px-4 pb-3 pt-4">
                <p className="text-center text-sm font-medium">{d.name}</p>
                <div className="flex items-center gap-2 text-xs text-neutral-600">
                  <span>{d.zone}</span>
                  <StatusPill status={d.status} />
                </div>
                <Link href={`/destinasi/${d.id}`} className="self-end text-[11px] text-brand-link underline">
                  Lihat Detail
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const body = (
    <div className="rounded-md border border-neutral-300 px-3 py-2">
      <dt className="text-xs text-neutral-600">{label}</dt>
      <dd className="text-2xl font-semibold">{value}</dd>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
