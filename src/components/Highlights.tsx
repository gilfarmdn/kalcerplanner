"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { HighlightItem } from "@/lib/data";

const PER_PAGE = 3; // jumlah kartu yang tampil
const INTERVAL_MS = 30_000; // ganti setiap 30 detik

export default function Highlights({ items }: { items: HighlightItem[] }) {
  const [start, setStart] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (items.length <= PER_PAGE) return; // tidak perlu berputar kalau cuma sedikit
    const timer = setInterval(() => {
      setFading(true); // pudar dulu
      setTimeout(() => {
        setStart((s) => (s + PER_PAGE) % items.length); // geser ke 3 berikutnya
        setFading(false); // lalu muncul lagi
      }, 300);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;

  const visible = Array.from({ length: Math.min(PER_PAGE, items.length) }, (_, i) => items[(start + i) % items.length]);

  return (
    <section id="highlight" className="mx-auto max-w-[1440px] px-4 pb-6 pt-14 sm:px-8 lg:px-[66px]">
      <h2 className="section-title">Highlight Jelajah</h2>

      <div
        className={`mt-10 grid gap-6 transition-opacity duration-300 sm:grid-cols-2 lg:grid-cols-3 lg:gap-[54px] ${
          fading ? "opacity-0" : "opacity-100"
        }`}
      >
        {visible.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group relative block aspect-[400/260] overflow-hidden rounded-[10px]"
          >
            <Image
              src={item.imageUrl}
              alt=""
              fill
              unoptimized
              sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 flex h-[38%] items-center justify-center bg-black/40 px-3 text-center">
              <p className="font-serif text-base font-medium text-white sm:text-xl">{item.title}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link href="/jelajah" className="inline-flex items-center gap-2 text-lg font-semibold text-brand-green hover:underline">
          Lihat semua →
        </Link>
      </div>
    </section>
  );
}