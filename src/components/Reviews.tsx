"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { ReviewItem } from "@/lib/data";

function Stars({ value, size = 35 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" role="img" aria-label={`Rating ${value} dari 5`}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} strokeWidth={1.5} className="absolute inset-0 text-neutral-800" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star size={size} strokeWidth={1.5} className="fill-yellow-400 text-neutral-800" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export default function Reviews({
  reviews,
  rating,
}: {
  reviews: ReviewItem[];
  rating: { average: number; count: number };
}) {
  const [index, setIndex] = useState(0);
  const current = reviews[index];
  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + reviews.length) % reviews.length);

  return (
    <section id="ulasan" className="mx-auto max-w-[1440px] px-4 pb-6 pt-14 sm:px-8">
      <h2 className="section-title">Ulasan</h2>

      <div className="mx-auto mt-8 max-w-[1080px] bg-white px-4 py-8 shadow-[0_4px_4px_rgba(0,0,0,0.25)] sm:px-12 lg:min-h-[310px]">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-between">
          <div className="text-center">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <p className="font-serif text-3xl font-bold sm:text-[40px]">{rating.average.toFixed(1)} / 5.0</p>
              <Stars value={rating.average} />
            </div>
            <p className="mt-2 text-[15px]">
              {rating.count > 0
                ? `Dari ${rating.count.toLocaleString("id-ID")} ulasan wisatawan`
                : "Belum ada ulasan. Jadilah yang pertama lewat halaman Bantuan."}
            </p>
          </div>

          {current && (
            <div className="flex w-full items-center justify-center gap-2 lg:w-auto lg:gap-6">
              <button type="button" onClick={() => go(-1)} aria-label="Ulasan sebelumnya" className="shrink-0 rounded p-1 hover:bg-neutral-100">
                <ChevronLeft size={48} strokeWidth={1.5} />
              </button>

              <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
                <Image
                  src={current.avatarUrl ?? "/images/avatar.svg"}
                  alt={current.authorName}
                  width={80}
                  height={80}
                  unoptimized
                  className="h-20 w-20 shrink-0 rounded-full object-cover"
                />
                <blockquote className="flex min-h-[250px] w-full max-w-[300px] flex-col items-center justify-center rounded-[10px] bg-brand-mist/10 p-6 text-center text-[15px]">
                  <p>{current.content}</p>
                  <footer className="mt-3 text-xs text-neutral-600">
                    — {current.authorName}
                    {current.authorRole ? `, ${current.authorRole}` : ""}
                  </footer>
                </blockquote>
              </div>

              <button type="button" onClick={() => go(1)} aria-label="Ulasan berikutnya" className="shrink-0 rounded p-1 hover:bg-neutral-100">
                <ChevronRight size={48} strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
