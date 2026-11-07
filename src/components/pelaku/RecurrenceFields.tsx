"use client";

import { useState } from "react";
import { RECURRENCES, WEEKDAY_OPTIONS, recurrenceLabel, type Recurrence } from "@/lib/recurrence";

export type RecurrenceValue = { recurrence: Recurrence; weekdays: number[]; exceptDates: string[] };

const input = "w-full rounded-lg border border-[#2c2c2c] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-link";
const fmt = (d: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));

export default function RecurrenceFields({ value, onChange }: { value: RecurrenceValue; onChange: (v: RecurrenceValue) => void }) {
  const [draft, setDraft] = useState("");
  const toggleDay = (d: number) =>
    onChange({ ...value, weekdays: value.weekdays.includes(d) ? value.weekdays.filter((x) => x !== d) : [...value.weekdays, d] });
  const addExcept = () => {
    if (!draft || value.exceptDates.includes(draft)) return;
    onChange({ ...value, exceptDates: [...value.exceptDates, draft].sort() });
    setDraft("");
  };

  return (
    <div className="space-y-3 sm:col-span-2">
      <label className="block text-sm font-medium">
        Pola jadwal
        <select value={value.recurrence} onChange={(e) => onChange({ ...value, recurrence: e.target.value as Recurrence })} className={`${input} select-arrow mt-1`}>
          {RECURRENCES.map((r) => (
            <option key={r} value={r}>{recurrenceLabel[r]}</option>
          ))}
        </select>
      </label>

      {value.recurrence === "WEEKLY" && (
        <>
          <fieldset className="text-sm font-medium">
            <legend>Berlangsung setiap hari</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {WEEKDAY_OPTIONS.map((d) => (
                <label key={d.value} className="inline-flex items-center gap-1 font-normal">
                  <input type="checkbox" checked={value.weekdays.includes(d.value)} onChange={() => toggleDay(d.value)} />
                  {d.label}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs font-normal text-neutral-600">
              Berlaku setiap pekan, setiap bulan, dalam rentang tanggal di bawah. Kosongkan tanggal selesai bila tanpa batas akhir.
            </p>
          </fieldset>

          <div className="text-sm font-medium">
            Tanggal libur / tidak ada acara
            <div className="mt-1 flex gap-2">
              <input type="date" value={draft} onChange={(e) => setDraft(e.target.value)} className={input} />
              <button type="button" onClick={addExcept} disabled={!draft} className="shrink-0 rounded-lg border border-neutral-400 px-3 text-sm font-normal disabled:opacity-50">
                Tambah
              </button>
            </div>
            {value.exceptDates.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {value.exceptDates.map((d) => (
                  <li key={d} className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-3 py-1 text-xs font-normal">
                    {fmt(d)}
                    <button type="button" aria-label={`Hapus libur ${fmt(d)}`} onClick={() => onChange({ ...value, exceptDates: value.exceptDates.filter((x) => x !== d) })} className="text-red-700">
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}