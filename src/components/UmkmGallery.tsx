"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { formatRupiah, type UmkmProduct } from "@/lib/content";

const MAX_SHOWN = 6; // 3 kartu per baris × 2 baris
export default function UmkmGallery({ products }: { products: UmkmProduct[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => [p.name, p.umkm, p.zone].some((v) => v.toLowerCase().includes(q)));
  }, [products, query]);

  const shown = filtered.slice(0, MAX_SHOWN);

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-12 sm:px-8 lg:px-[134px]">
      <h1 className="font-serif text-3xl font-bold sm:text-[40px]">Galeri UMKM Wisata Budaya</h1>
      <p className="mt-2 text-sm text-neutral-700">
        Punya usaha oleh-oleh khas daerah?{" "}
        <Link href="/daftar" className="text-brand-link underline">
          Daftar
        </Link>{" "}
        atau{" "}
        <Link href="/masuk" className="text-brand-link underline">
          masuk
        </Link>{" "}
        untuk menampilkan produkmu.
      </p>

      <label className="mt-8 flex h-[85px] max-w-[722px] items-center gap-5 rounded-[10px] border border-black bg-white px-3">
        <Search size={48} strokeWidth={1.5} className="shrink-0 text-neutral-500" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari wilayah atau produk"
          aria-label="Cari UMKM berdasarkan wilayah atau produk"
          className="w-full bg-transparent font-serif text-[30px] font-semibold outline-none placeholder:text-neutral-400"
        />
      </label>

      {products.length === 0 ? (
        <p className="mt-16 text-center text-xl text-neutral-600">Belum ada produk UMKM.</p>
      ) : filtered.length === 0 ? (
        <p className="mt-16 text-center text-xl text-neutral-600">Belum ada produk untuk “{query}”.</p>
      ) : (
        <ul className="mt-16 grid gap-x-[47px] gap-y-[55px] sm:grid-cols-2 lg:grid-cols-3 lg:max-w-[1087px]">
          {shown.map((p) => (
            <li key={p.id} className="rounded-[10px] border-2 border-black bg-white p-[11px]">
              <div className="relative aspect-[305/350] overflow-hidden rounded-[10px]">
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 305px, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="px-1 pb-6 pt-3 leading-[30px]">
                <p className="text-xl font-medium">{p.name}</p>
                <p className="text-[15px]">UMKM : {p.umkm} · {p.zone}</p>
                <p className="text-[15px]">{formatRupiah(p.price)}</p>
                <p className="mt-1 text-sm leading-snug text-neutral-700">{p.story}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {filtered.length > MAX_SHOWN && (
        <p className="mt-8 text-sm text-neutral-600">
          Menampilkan {MAX_SHOWN} dari {filtered.length} produk. Ketik di kolom pencarian untuk melihat yang lain.
        </p>
      )}
    </div>
  );
}
