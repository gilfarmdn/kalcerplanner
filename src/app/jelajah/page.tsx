import type { Metadata } from "next";
import Image from "next/image";
import InterestSection, { type JelajahItem } from "@/components/InterestSection";
import SiteShell from "@/components/SiteShell";
import { INTERESTS, interestInfo } from "@/lib/culture";
import { objectImage, VISIBLE_STATUSES } from "@/lib/culture-db";
import { prisma } from "@/lib/prisma";

export const generateMetadata = (): Metadata => ({ title: "Jelajah — KalcerPlanner" });
export const dynamic = "force-dynamic";

/** Jumlah kartu yang tampil di tiap kelompok minat; sisanya bisa dicari lewat kolom pencarian. */
const MAX_PER_INTEREST = 4;

/** Acak daftar (Fisher-Yates) lalu ambil n item pertama. Berbeda tiap halaman dimuat. */
function pickRandom<T>(list: T[], n: number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

export default async function JelajahPage() {
  const rows = await prisma.culturalObject.findMany({
    where: { status: { in: [...VISIBLE_STATUSES] } },
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, zone: true, summary: true, priceIdr: true, interest: true, imageUrl: true, hiddenGem: true, isEvent: true },
  });
  const objects = rows;

  return (
    <SiteShell>
      <section className="relative isolate mx-auto min-h-[420px] max-w-[1440px] overflow-hidden">
        <Image src="/images/hero.svg" alt="" fill priority unoptimized sizes="100vw" className="-z-10 object-cover" />
        <div className="absolute inset-y-0 left-0 w-full rounded-[10px] bg-gradient-to-r from-black to-[#666] opacity-80 lg:w-[723px]" />
        <div className="relative flex min-h-[420px] flex-col justify-center px-6 py-12 text-white lg:max-w-[680px] lg:pl-24">
          <h1 className="font-serif text-3xl font-bold sm:text-[40px]">Jelajah Budaya Nusantara</h1>
          <p className="mt-6 max-w-[515px] font-serif text-[15px]">
            Setiap tempat dilengkapi makna budaya dan etika berkunjung
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-4 pb-20 pt-12 sm:px-8 lg:px-20">
        {INTERESTS.map((interest) => {
          const items = objects.filter((o) => o.interest === interest);
          if (items.length === 0) return null;
          const info = interestInfo[interest];
          const all: JelajahItem[] = items.map((o) => ({
            id: o.id,
            slug: o.slug,
            name: o.name,
            zone: o.zone,
            summary: o.summary,
            priceIdr: o.priceIdr,
            image: objectImage(o),
            hiddenGem: o.hiddenGem,
            isEvent: o.isEvent,
          }));
          return (
            <InterestSection
              key={interest}
              anchor={info.slug}
              label={info.label}
              hint={info.hint}
              featured={pickRandom(all, MAX_PER_INTEREST)}
              all={all}
              maxShown={MAX_PER_INTEREST}
            />
          );
        })}
      </div>
    </SiteShell>
  );
}
