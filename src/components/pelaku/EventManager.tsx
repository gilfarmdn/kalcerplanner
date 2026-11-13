"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import RecurrenceFields, { type RecurrenceValue } from "@/components/pelaku/RecurrenceFields";
import { weekdaysText } from "@/lib/recurrence";

export type EventRow = {
  id: string;
  title: string;
  description: string;
  startsOn: string; // YYYY-MM-DD ("" bila belum ada)
  endsOn: string;
  repeatsYearly: boolean;
  weekdays: number[];
  exceptDates: string[];
  venue: string;
  isActive: boolean;
};

const input = "w-full rounded-lg border border-[#2c2c2c] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-link";

function fmt(d: string) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
}

/** Tambah, ubah, dan hapus event budaya milik satu destinasi. */
export default function EventManager({ objectId, events }: { objectId: string; events: EventRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<EventRow | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rec, setRec] = useState<RecurrenceValue>({ recurrence: "ONCE", weekdays: [], exceptDates: [] });

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const current = editing && editing !== "new" ? editing : null;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(current ? `/api/pelaku/events/${current.id}` : "/api/pelaku/events", {
        method: current ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectId,
          title: f.get("title"),
          description: f.get("description"),
          startsOn: f.get("startsOn"),
          endsOn: f.get("endsOn") || undefined,
          recurrence: rec.recurrence,
          weekdays: rec.weekdays,
          exceptDates: rec.exceptDates,
          venue: f.get("venue"),
          isActive: f.get("isActive") === "on",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Gagal menyimpan.");
        return;
      }
      setEditing(null);
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(ev: EventRow | "new") {
    setError(null);
    setRec(
      ev === "new"
        ? { recurrence: "ONCE", weekdays: [], exceptDates: [] }
        : { recurrence: ev.weekdays.length ? "WEEKLY" : ev.repeatsYearly ? "YEARLY" : "ONCE", weekdays: ev.weekdays, exceptDates: ev.exceptDates },
    );
    setEditing(ev);
  }

  async function remove(ev: EventRow) {
    if (!window.confirm(`Hapus event "${ev.title}"?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pelaku/events/${ev.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json.error ?? "Gagal menghapus.");
      else router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  const cur = editing && editing !== "new" ? editing : null;

  return (
    <div>
      {events.length === 0 ? (
        <p className="text-sm text-neutral-700">Belum ada event untuk destinasi ini.</p>
      ) : (
        <ul className="space-y-3">
          {events.map((ev) => (
            <li key={ev.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-neutral-300 p-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {ev.title}
                  {!ev.isActive && <span className="ml-2 rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-normal">Nonaktif</span>}
                </p>
                <p className="text-xs text-neutral-600">
                  {ev.endsOn && ev.endsOn !== ev.startsOn ? `${fmt(ev.startsOn)} – ${fmt(ev.endsOn)}` : fmt(ev.startsOn)}
                  {ev.repeatsYearly && " · berulang tiap tahun"}
                  {ev.weekdays.length > 0 && ` · tiap ${weekdaysText(ev.weekdays)}`}
                  {ev.weekdays.length > 0 && ev.exceptDates.length > 0 && ` · ${ev.exceptDates.length} hari libur`}
                  {ev.venue && ` · ${ev.venue}`}
                </p>
                <p className="mt-1 text-sm">{ev.description}</p>
              </div>
              <div className="flex shrink-0 gap-3 text-sm">
                <button type="button" onClick={() => startEdit(ev)} className="text-brand-link underline">Ubah</button>
                <button type="button" onClick={() => remove(ev)} disabled={busy} className="text-red-700 underline disabled:opacity-60">Hapus</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!editing && (
        <button type="button" onClick={() => startEdit("new")} className="mt-4 rounded-lg bg-brand-green px-4 py-2 text-sm text-white hover:brightness-110">
          Tambah event
        </button>
      )}

      {editing && (
        <form key={cur?.id ?? "new"} onSubmit={save} className="mt-4 grid gap-3 rounded-lg border border-neutral-300 p-4 sm:grid-cols-2">
          <label className="text-sm font-medium sm:col-span-2">
            Judul event
            <input name="title" required minLength={3} maxLength={120} defaultValue={cur?.title} className={`${input} mt-1`} />
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Deskripsi
            <textarea name="description" required minLength={10} maxLength={1500} rows={3} defaultValue={cur?.description} className={`${input} mt-1`} />
          </label>
          <RecurrenceFields value={rec} onChange={setRec} />
          <label className="text-sm font-medium">
            {rec.recurrence === "WEEKLY" ? "Berlaku mulai" : "Tanggal mulai"}
            <input name="startsOn" type="date" required defaultValue={cur?.startsOn} className={`${input} mt-1`} />
          </label>
          <label className="text-sm font-medium">
            {rec.recurrence === "WEEKLY" ? "Berlaku sampai (kosong = tanpa batas)" : "Tanggal selesai (kosong = 1 hari)"}
            <input name="endsOn" type="date" defaultValue={cur?.endsOn} className={`${input} mt-1`} />
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Lokasi spesifik (wajib diisi)
            <input name="venue" required maxLength={120} placeholder="Mis. Pendopo utama" defaultValue={cur?.venue} className={`${input} mt-1`} />
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input name="isActive" type="checkbox" defaultChecked={cur?.isActive ?? true} />
            Tampil di kalender
          </label>
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" disabled={busy} className="rounded-lg bg-brand-green px-4 py-2 text-sm text-white hover:brightness-110 disabled:opacity-60">
              {busy ? "Menyimpan..." : "Simpan event"}
            </button>
            <button type="button" onClick={() => { setEditing(null); setError(null); }} className="rounded-lg border border-neutral-400 px-4 py-2 text-sm">
              Batal
            </button>
          </div>
        </form>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
