"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Search } from "lucide-react";
import { formatRupiah } from "@/lib/culture";

export type JelajahItem = {
  id: string;
  slug: string;
  name: string;
  zone: string;
  summary: string;
  priceIdr: number;
  image: string;
  hiddenGem: boolean;
  isEvent: boolean;
};

function ObjectCard({ o }: { o: JelajahItem }) {
  return (
    <Link
      href={`/jelajah/${o.slug}`}
      className="group relative block h-[350px] overflow-hidden shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
    >
      <Image
        src={o.image}
        alt={`${o.name}, ${o.zone}`}
        fill
        unoptimized
        sizes="(min-width: 1024px) 305px, 50vw"
        className="object-cover transition duration-500 group-hover:scale-105"
      />
      {o.hiddenGem && (
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold">Kurang padat</span>
      )}
      {o.isEvent && (
        <span className="absolute right-2 top-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold">Event</span>
      )}
      <div className="absolute inset-x-0 bottom-0 flex h-[155px] flex-col items-center justify-center bg-white px-3 text-center text-lg font-medium leading-snug">
        <p className="font-semibold">{o.name}</p>
        <p className="text-neutral-700">{o.zone}</p>
        <p>{o.priceIdr === 0 ? "Gratis / donasi" : formatRupiah(o.priceIdr)}</p>
      </div>
    </Link>
  );
}

/**
 * Satu kelompok minat budaya. Kolom pencarian selalu ada tepat di bawah judul, sebelum kartu.
 * Kolom kosong: tampil kartu pilihan (acak dari server). Ada isi: kartu diganti hasil pencarian di kelompok ini.
 */
export default function InterestSection({
  anchor,
  label,
  hint,
  featured,
  all,
  maxShown,
}: {
  anchor: string;
  label: string;
  hint: string;
  featured: JelajahItem[];
  all: JelajahItem[];
  maxShown: number;
}) {
  const [query, setQuery] = useState("");

  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const searching = terms.length > 0;
  const matches = searching
    ? all.filter((o) => {
        const haystack = `${o.name} ${o.zone} ${o.summary}`.toLowerCase();
        return terms.every((t) => haystack.includes(t));
      })
    : [];

  const shown = searching ? matches.slice(0, maxShown) : featured;

  return (
    <section id={anchor} className="mb-16 scroll-mt-32">
      <h2 className="font-serif text-3xl font-bold sm:text-[40px]">{label}</h2>
      <p className="mt-1 text-neutral-600">{hint}</p>

      <div className="mt-5">
        <label className="relative block max-w-xl">
          <span className="sr-only">Cari objek di {label}</span>
          <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Cari objek di ${label} (nama, wilayah, atau kata kunci)`}
            className="h-12 w-full rounded-lg border border-neutral-300 bg-white pl-12 pr-4 text-base outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/30"
          />
        </label>
        <p className="mt-2 text-sm text-neutral-600" aria-live="polite">
          {!searching && `Menampilkan ${featured.length} dari ${all.length} objek. Ketik untuk mencari yang lain.`}
          {searching && matches.length === 0 && `Tidak ada objek yang cocok dengan “${query.trim()}”.`}
          {searching && matches.length > 0 && matches.length <= maxShown && `${matches.length} objek ditemukan.`}
          {searching &&
            matches.length > maxShown &&
            `Menampilkan ${maxShown} dari ${matches.length} objek yang cocok. Ketik lebih spesifik untuk mempersempit.`}
        </p>
      </div>

      {shown.length > 0 && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((o) => (
            <ObjectCard key={o.id} o={o} />
          ))}
        </div>
      )}
    </section>
  );
}
