"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { VISIT_STATUSES, visitStatusLabel } from "@/lib/pelaku-validators";

export type VisitRow = {
  id: string;
  objectId: string | null;
  objectName: string;
  eventId: string | null;
  eventTitle: string | null;
  visitorName: string;
  contact: string;
  partySize: number;
  visitDate: string;
  status: (typeof VISIT_STATUSES)[number];
  source: "ONLINE" | "WALKIN";
  note: string;
};

/** Tujuan kunjungan: destinasi ("o:<id>") atau event mandiri ("e:<id>"). */
type Option = { value: string; label: string };
type EventOption = { id: string; title: string; objectId: string };

const input = "w-full rounded-lg border border-[#2c2c2c] bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-link";
const statusCls: Record<VisitRow["status"], string> = {
  BOOKED: "bg-amber-100 text-amber-900",
  ATTENDED: "bg-emerald-100 text-emerald-900",
  CANCELLED: "bg-neutral-200 text-neutral-700",
};

const dateFmt = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const showDate = (d: string) => dateFmt.format(new Date(`${d}T00:00:00Z`));

/** Daftar kunjungan + tambah tamu walk-in, ubah, tandai hadir/batal, hapus. */
export default function VisitManager({
  rows,
  targets,
  events,
  defaultDate,
  exportHref,
}: {
  rows: VisitRow[];
  targets: Option[];
  events: EventOption[];
  defaultDate: string;
  exportHref: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addTarget, setAddTarget] = useState(targets[0]?.value ?? "");
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(url: string, method: string, body?: unknown, id = "new") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Terjadi kesalahan.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Tidak dapat terhubung ke server.");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const target = String(f.get("target") ?? "");
    const id = target.slice(2);
    const ok = await call("/api/pelaku/visits", "POST", {
      ...(target.startsWith("e:") ? { eventId: id } : { objectId: id, eventId: f.get("eventId") || null }),
      visitorName: f.get("visitorName"),
      contact: f.get("contact") || undefined,
      partySize: Number(f.get("partySize")),
      visitDate: f.get("visitDate"),
      status: f.get("status"),
      note: f.get("note") || undefined,
    });
    if (ok) setAdding(false);
  }

  async function saveEdit(e: FormEvent<HTMLFormElement>, row: VisitRow) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const ok = await call(
      `/api/pelaku/visits/${row.id}`,
      "PATCH",
      {
        visitorName: f.get("visitorName"),
        contact: String(f.get("contact") ?? ""),
        partySize: Number(f.get("partySize")),
        visitDate: f.get("visitDate"),
        note: String(f.get("note") ?? ""),
      },
      row.id,
    );
    if (ok) setEditId(null);
  }

  async function remove(row: VisitRow) {
    if (!window.confirm(`Hapus catatan kunjungan "${row.visitorName}"?`)) return;
    await call(`/api/pelaku/visits/${row.id}`, "DELETE", undefined, row.id);
  }

  const addEvents = addTarget.startsWith("o:") ? events.filter((ev) => ev.objectId === addTarget.slice(2)) : [];

  return (
    <div className="max-w-5xl">
      <div className="mb-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => setAdding((v) => !v)} className="rounded-lg bg-brand-green px-4 py-2 text-sm text-white hover:brightness-110">
          {adding ? "Tutup form" : "Catat pengunjung"}
        </button>
        <a href={exportHref} className="rounded-lg border border-neutral-400 px-4 py-2 text-sm hover:bg-neutral-50">
          Unduh CSV
        </a>
      </div>

      {adding && (
        <form onSubmit={add} className="mb-6 grid gap-3 rounded-lg border border-neutral-300 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-medium">
            Destinasi / event
            <select name="target" value={addTarget} onChange={(e) => setAddTarget(e.target.value)} className={`${input} select-arrow mt-1`}>
              {targets.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Kegiatan (opsional)
            <select name="eventId" defaultValue="" key={addTarget} disabled={addEvents.length === 0} className={`${input} select-arrow mt-1`}>
              <option value="">Tanpa kegiatan</option>
              {addEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Tanggal kunjungan
            <input name="visitDate" type="date" required defaultValue={defaultDate} className={`${input} mt-1`} />
          </label>
          <label className="text-xs font-medium">
            Nama pengunjung
            <input name="visitorName" required minLength={2} maxLength={80} className={`${input} mt-1`} />
          </label>
          <label className="text-xs font-medium">
            Kontak (opsional)
            <input name="contact" maxLength={80} placeholder="Email / WhatsApp" className={`${input} mt-1`} />
          </label>
          <label className="text-xs font-medium">
            Jumlah orang
            <input name="partySize" type="number" required min={1} max={500} defaultValue={1} className={`${input} mt-1`} />
          </label>
          <label className="text-xs font-medium">
            Status
            <select name="status" defaultValue="ATTENDED" className={`${input} select-arrow mt-1`}>
              {VISIT_STATUSES.map((s) => (
                <option key={s} value={s}>{visitStatusLabel[s]}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium sm:col-span-2">
            Catatan (opsional)
            <input name="note" maxLength={300} className={`${input} mt-1`} />
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <button type="submit" disabled={busyId === "new"} className="rounded-lg bg-brand-green px-4 py-2 text-sm text-white hover:brightness-110 disabled:opacity-60">
              {busyId === "new" ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      )}

      {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}

      {rows.length === 0 ? (
        <p className="text-neutral-700">Tidak ada data kunjungan pada filter ini.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border border-neutral-300 p-3">
              {editId === r.id ? (
                <form onSubmit={(e) => saveEdit(e, r)} className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-medium">
                    Nama
                    <input name="visitorName" required minLength={2} maxLength={80} defaultValue={r.visitorName} className={`${input} mt-1`} />
                  </label>
                  <label className="text-xs font-medium">
                    Kontak
                    <input name="contact" maxLength={80} defaultValue={r.contact} className={`${input} mt-1`} />
                  </label>
                  <label className="text-xs font-medium">
                    Tanggal
                    <input name="visitDate" type="date" required defaultValue={r.visitDate} className={`${input} mt-1`} />
                  </label>
                  <label className="text-xs font-medium">
                    Jumlah orang
                    <input name="partySize" type="number" required min={1} max={500} defaultValue={r.partySize} className={`${input} mt-1`} />
                  </label>
                  <label className="text-xs font-medium sm:col-span-2">
                    Catatan
                    <input name="note" maxLength={300} defaultValue={r.note} className={`${input} mt-1`} />
                  </label>
                  <div className="flex gap-3 sm:col-span-2">
                    <button type="submit" disabled={busyId === r.id} className="rounded-lg bg-brand-green px-4 py-1.5 text-sm text-white disabled:opacity-60">Simpan</button>
                    <button type="button" onClick={() => setEditId(null)} className="rounded-lg border border-neutral-400 px-4 py-1.5 text-sm">Batal</button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {r.visitorName} <span className="font-normal text-neutral-600">· {r.partySize} orang</span>
                    </p>
                    <p className="text-xs text-neutral-600">
                      {showDate(r.visitDate)} · {r.objectName}
                      {r.eventTitle ? ` · ${r.eventTitle}` : ""}
                    </p>
                    <p className="text-xs text-neutral-600">
                      {r.contact || "Tanpa kontak"} · {r.source === "WALKIN" ? "Walk-in" : "Daftar daring"}
                    </p>
                    {r.note && <p className="mt-1 text-sm">{r.note}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <select
                      aria-label={`Status ${r.visitorName}`}
                      value={r.status}
                      disabled={busyId === r.id}
                      onChange={(e) => call(`/api/pelaku/visits/${r.id}`, "PATCH", { status: e.target.value }, r.id)}
                      className={`select-arrow rounded-full border-0 px-3 py-1 text-xs font-medium ${statusCls[r.status]}`}
                    >
                      {VISIT_STATUSES.map((s) => (
                        <option key={s} value={s}>{visitStatusLabel[s]}</option>
                      ))}
                    </select>
                    <div className="flex gap-3 text-sm">
                      <button type="button" onClick={() => setEditId(r.id)} className="text-brand-link underline">Ubah</button>
                      <button type="button" onClick={() => remove(r)} disabled={busyId === r.id} className="text-red-700 underline disabled:opacity-60">Hapus</button>
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
