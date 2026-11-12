"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthNames } from "@/lib/culture";
import { eventOccursOn, monthCells, type CalEvent } from "@/lib/kalender";
import { formatHariPanjang } from "@/lib/tanggal";

const DAY_HEADERS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"] as const;

/** Satu baris kegiatan yang siap ditampilkan (semuanya berasal dari tabel CulturalEvent). */
type Item = {
  key: string;
  title: string;
  zone: string;
  description: string;
  location: string | null;
  href: string | null;
  imageUrl: string | null;
};

export default function EventCalendar({
  events,
  zones,
  today,
}: {
  events: CalEvent[];
  zones: string[];
  today: string;
}) {
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)) - 1); // 0..11
  const [selected, setSelected] = useState(today);
  const [zone, setZone] = useState("");

  const visibleEvents = zone ? events.filter((e) => e.zone === zone) : events;

  function itemsOn(ymd: string): Item[] {
    return visibleEvents
      .filter((e) => eventOccursOn(e, ymd))
      .map((e) => ({
        key: `e-${e.id}`,
        title: e.title,
        zone: e.zone,
        description: e.description,
        location: e.location,
        href: e.href !== undefined ? e.href : e.objectSlug ? `/jelajah/${e.objectSlug}` : null,
        imageUrl: e.imageUrl,
      }));
  }

  function shiftMonth(delta: number) {
    const d = new Date(Date.UTC(year, month + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth());
  }

  function goToday() {
    setYear(Number(today.slice(0, 4)));
    setMonth(Number(today.slice(5, 7)) - 1);
    setSelected(today);
  }

  const cells = monthCells(year, month);
  const selectedItems = itemsOn(selected);

  const navBtn = "flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 hover:bg-neutral-50";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shiftMonth(-1)} aria-label="Bulan sebelumnya" className={navBtn}>
            <ChevronLeft size={20} />
          </button>
          <h2 className="min-w-[11rem] text-center font-serif text-2xl font-bold">
            {monthNames[month]} {year}
          </h2>
          <button type="button" onClick={() => shiftMonth(1)} aria-label="Bulan berikutnya" className={navBtn}>
            <ChevronRight size={20} />
          </button>
          <button type="button" onClick={goToday} className="ml-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold hover:bg-neutral-50">
            Hari ini
          </button>
        </div>

        {zones.length > 1 && (
          <label className="flex items-center gap-2 text-sm font-medium">
            Wilayah
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="select-arrow h-10 rounded-lg border border-neutral-300 bg-white px-3 text-base"
            >
              <option value="">Semua wilayah</option>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-neutral-300 bg-white">
        <div className="grid grid-cols-7 border-b border-neutral-300 bg-neutral-50 text-center text-sm font-semibold">
          {DAY_HEADERS.map((d, i) => (
            <div key={d} className={`py-2 ${i === 0 ? "text-red-600" : ""}`}>
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((ymd, i) => {
            if (!ymd) return <div key={`blank-${i}`} className="h-14 border-b border-r border-neutral-100 bg-neutral-50/60 sm:h-20" />;
            const isSelected = ymd === selected;
            const isToday = ymd === today;
            const has = itemsOn(ymd).length > 0;
            return (
              <button
                key={ymd}
                type="button"
                onClick={() => setSelected(ymd)}
                aria-pressed={isSelected}
                aria-label={`${formatHariPanjang(ymd)}${has ? ", ada kegiatan" : ""}`}
                className={`flex h-14 flex-col items-center justify-start gap-1 border-b border-r border-neutral-100 pt-2 text-base transition sm:h-20 sm:text-lg ${
                  isSelected ? "bg-brand-green text-white" : "hover:bg-neutral-50"
                } ${i % 7 === 0 && !isSelected ? "text-red-600" : ""}`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full font-medium ${
                    isToday && !isSelected ? "border-2 border-brand-green" : ""
                  }`}
                >
                  {Number(ymd.slice(8))}
                </span>
                {has && <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-emerald-600"}`} />}
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-xs text-neutral-600">Titik hijau menandai tanggal yang sedang ada kegiatan</p>

      {/* Kegiatan pada tanggal terpilih */}
      <section className="mt-8" aria-live="polite">
        <h3 className="font-serif text-2xl font-bold">{formatHariPanjang(selected)}</h3>
        {selectedItems.length === 0 ? (
          <p className="mt-3 rounded-[10px] border border-dashed border-neutral-400 bg-neutral-50 p-4 text-neutral-700">
            Sedang tidak ada kegiatan berlangsung di tanggal tersebut.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {selectedItems.map((it) => (
              <li key={it.key} className="rounded-[10px] border border-black bg-white p-4">
                {it.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.imageUrl} alt={it.title} className="mb-3 h-40 w-full rounded-md object-cover" />
                )}
                <h4 className="text-xl font-semibold">{it.title}</h4>
                {it.zone && <p className="text-sm text-neutral-700">{it.zone}</p>}
                <p className="mt-3">{it.description}</p>
                <p className="mt-3 text-sm">
                  <span className="font-semibold">Lokasi: </span>
                  {it.location ? (
                    it.href ? (
                      <Link href={it.href} className="text-brand-link underline">
                        {it.location}
                      </Link>
                    ) : (
                      it.location
                    )
                  ) : (
                    "Belum dicantumkan"
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* {undated.length > 0 && (
        <section className="mt-12">
          <h3 className="font-serif text-2xl font-bold">Tanggal belum pasti</h3>
          <p className="mt-1 text-sm text-neutral-600">
            Banyak upacara mengikuti kalender Jawa dan Hijriah sehingga tanggalnya bergeser tiap tahun. Kegiatan ini baru
            muncul di kalender setelah tanggalnya diumumkan resmi.
          </p>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {undated.map((e) => (
              <li key={e.id} className="rounded-[10px] border border-black bg-white p-4">
                <p className="text-sm font-semibold text-brand-brown">
                  {e.monthHint ? `Biasanya ${monthNames[e.monthHint - 1]}` : "Mengikuti kalender Jawa / Hijriah"}
                </p>
                <h4 className="mt-1 text-lg font-semibold">{e.title}</h4>
                {e.zone && <p className="text-sm text-neutral-700">{e.zone}</p>}
                <p className="mt-2 text-sm">{e.description}</p>
                <p className="mt-2 text-sm text-amber-800">{e.dateNote}</p>
              </li>
            ))}
          </ul>
        </section>
      )} */}
    </div>
  );
}
