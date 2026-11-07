import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import SiteShell from "@/components/SiteShell";
import { requireUser } from "@/lib/auth";
import { objectImage } from "@/lib/culture-db";
import { formatRange, todayJakarta } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "My Trip — KalcerPlanner" };
export const dynamic = "force-dynamic";

export default async function TripListPage() {
  const user = await requireUser("/trip");
  if (user.role !== "TRAVELER") redirect("/pelaku");
  const today = new Date(`${todayJakarta()}T00:00:00.000Z`);

  const trips = await prisma.trip.findMany({
    where: { userId: user.id },
    orderBy: { startDate: "asc" },
    include: {
      items: { orderBy: { sortOrder: "asc" }, take: 1, include: { object: { select: { slug: true, imageUrl: true } } } },
      _count: { select: { items: true } },
    },
  });
  const upcoming = trips.filter((t) => t.endDate >= today);
  const past = trips.filter((t) => t.endDate < today).reverse();

  const Card = ({ t }: { t: (typeof trips)[number] }) => (
    <li className="overflow-hidden rounded-[10px] border border-black bg-white shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
      <div className="relative h-44">
        <Image
          src={t.items[0] ? objectImage(t.items[0].object) : "/images/hero.svg"}
          alt=""
          fill
          unoptimized
          sizes="(min-width: 1024px) 383px, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex items-end justify-between gap-3 p-4">
        <div>
          <p className="text-xl font-semibold">{t.title.split(" · ")[0]}</p>
          <p className="text-base">({formatRange(t.startDate, t.endDate)})</p>
          <p className="text-sm text-neutral-600">{t._count.items} pengalaman budaya</p>
        </div>
        <Link href={`/trip/${t.id}`} className="shrink-0 rounded-[5px] bg-brand-green px-3 py-1.5 text-base font-medium text-white hover:brightness-110">
          Lihat Detail
        </Link>
      </div>
    </li>
  );

  return (
    <SiteShell>
      <DashboardShell heading={`Selamat datang kembali, ${user.name.split(" ")[0]}`}>
        <Link
          href="/rencana"
          className="flex h-[200px] max-w-[594px] items-center justify-center gap-5 rounded-[10px] bg-brand-mist/40 shadow-[0_4px_4px_rgba(0,0,0,0.25)] transition hover:bg-brand-mist/60"
        >
          <Briefcase size={67} strokeWidth={1.5} aria-hidden />
          <span className="font-serif text-3xl font-bold">Buat Trip Baru</span>
        </Link>

        <h2 className="mt-12 font-serif text-3xl font-bold">Perjalanan Terdekat</h2>
        {upcoming.length === 0 ? (
          <p className="mt-4 text-neutral-700">Belum ada perjalanan mendatang. Mulai dengan “Buat Trip Baru”.</p>
        ) : (
          <ul className="mt-6 grid gap-8 md:grid-cols-2 xl:grid-cols-3">{upcoming.map((t) => <Card key={t.id} t={t} />)}</ul>
        )}

        {past.length > 0 && (
          <>
            <h2 className="mt-14 font-serif text-3xl font-bold">Perjalanan Sebelumnya</h2>
            <ul className="mt-6 grid gap-8 md:grid-cols-2 xl:grid-cols-3">{past.map((t) => <Card key={t.id} t={t} />)}</ul>
          </>
        )}
      </DashboardShell>
    </SiteShell>
  );
}
