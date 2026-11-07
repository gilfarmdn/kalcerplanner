"use client";

import Image from "next/image";
import { useState } from "react";
import type { StoryItem } from "@/lib/data";

export default function Stories({ items }: { items: StoryItem[] }) {
  const [index, setIndex] = useState(0);

  // Sembunyi total selama belum ada cerita yang dipublikasikan
  if (items.length === 0) return null;

  const current = items[index];
  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + items.length) % items.length);
  const arrow = "shrink-0 rounded p-2 text-3xl text-neutral-700 hover:bg-neutral-100";

  return (
    <section id="cerita" className="mx-auto max-w-[1440px] px-4 pb-16 pt-14 sm:px-8">
      <h2 className="section-title">Cerita Pelaku Budaya</h2>

      <div className="mx-auto mt-8 flex max-w-[1080px] items-center justify-center gap-2 sm:gap-6">
        {items.length > 1 && (
          <button type="button" onClick={() => go(-1)} aria-label="Cerita sebelumnya" className={arrow}>
            ◀
          </button>
        )}

        <article className="flex w-full flex-col items-center gap-6 bg-white px-6 py-8 shadow-[0_4px_4px_rgba(0,0,0,0.25)] sm:flex-row sm:items-start sm:px-10">
          <Image
            src={current.avatarUrl ?? "/images/avatar.svg"}
            alt={current.name}
            width={120}
            height={120}
            unoptimized
            className="h-[120px] w-[120px] shrink-0 rounded-full object-cover"
          />
          <div className="text-center sm:text-left">
            <h3 className="font-serif text-2xl font-bold">{current.name}</h3>
            <p className="text-sm font-semibold text-neutral-600">{current.origin}</p>
            <p className="mt-4 whitespace-pre-line text-base leading-relaxed">{current.content}</p>
          </div>
        </article>

        {items.length > 1 && (
          <button type="button" onClick={() => go(1)} aria-label="Cerita berikutnya" className={arrow}>
            ▶
          </button>
        )}
      </div>
    </section>
  );
}