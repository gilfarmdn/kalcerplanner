"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

type Item = { q: string; a: string };

export default function Faq({ items }: { items: readonly Item[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section aria-labelledby="faq-title" className="max-w-[967px]">
      <h2 id="faq-title" className="font-serif text-3xl font-extrabold sm:text-[35px]">
        Frequently Asked Questions
      </h2>

      <div className="mt-6 space-y-3">
        {items.map((item, i) => {
          const open = openIndex === i;
          return (
            <div key={item.q} className="rounded-[5px] bg-brand-gray">
              <h3>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`faq-panel-${i}`}
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="flex min-h-[60px] w-full items-center justify-between gap-4 px-[18px] py-2 text-left text-base font-semibold sm:text-xl"
                >
                  <span>{item.q}</span>
                  {open ? <Minus size={36} className="shrink-0" /> : <Plus size={36} className="shrink-0" />}
                </button>
              </h3>
              {open && (
                <div id={`faq-panel-${i}`} className="px-[18px] pb-4 text-base">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
