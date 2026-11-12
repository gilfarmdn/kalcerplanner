"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { formatHariPanjang } from "@/lib/tanggal";

/** Dikirim setelah daftar / batal agar semua kartu kuota di halaman memuat ulang sisanya. */
const KUOTA_CHANGED = "kuota:changed";

type KuotaInfo = {
  quota: number | null;
  remaining: number | null;
  open: boolean;
  visit: {
    id: string;
    date: string;
    partySize: number;
    status: "BOOKED" | "ATTENDED" | "CANCELLED";
    changeNotice: string | null;
    canCancel: boolean;
  } | null;
};

/** Tujuan pendaftaran: destinasi (`objectId`) atau event mandiri (`eventId`). */
export type VisitTargetProps = { objectId: string; eventId?: undefined } | { eventId: string; objectId?: undefined };

const targetKey = (t: VisitTargetProps) => (t.objectId ?? t.eventId)!;
const targetParam = (t: VisitTargetProps) => (t.objectId ? `objectId=${encodeURIComponent(t.objectId)}` : `eventId=${encodeURIComponent(t.eventId!)}`);

async function fetchKuota(target: VisitTargetProps, date: string): Promise<KuotaInfo | null> {
  const res = await fetch(`/api/visits/kuota?${targetParam(target)}&date=${date}`, { cache: "no-store" });
  return res.ok ? res.json() : null;
}

async function postVisit(target: VisitTargetProps, date: string, partySize: number): Promise<string | null> {
  try {
    const res = await fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(target.objectId ? { objectId: target.objectId } : { eventId: target.eventId }), visitDate: date, partySize }),
    });
    if (res.ok) return null;
    const json = await res.json().catch(() => ({}));
    return json.error ?? "Gagal mendaftar.";
  } catch {
    return "Tidak dapat terhubung ke server.";
  }
}

const field = "rounded-lg border border-[#2c2c2c] bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-link";

/**
 * Pendaftaran kunjungan untuk satu tempat berkuota: sisa kuota, form singkat (tanggal + jumlah orang),
 * status "Terdaftar ✓" dan tombol Batalkan (paling lambat H-1). Tidak tampil bila tempat tanpa kuota.
 */
export default function VisitRegistration({
  objectId,
  eventId,
  defaultDate,
  defaultParty = 1,
  minDate,
}: {
  objectId?: string;
  eventId?: string;
  defaultDate: string;
  defaultParty?: number;
  minDate: string;
}) {
  const router = useRouter();
  const target = (objectId ? { objectId } : { eventId: eventId! }) as VisitTargetProps;
  const key = targetKey(target);
  const [date, setDate] = useState(defaultDate < minDate ? minDate : defaultDate);
  const [party, setParty] = useState(defaultParty);
  const [info, setInfo] = useState<KuotaInfo | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchKuota(target, date).then(setInfo).catch(() => setInfo(null));
    // `target` dibentuk ulang tiap render; `key` (id tujuan) yang menentukan perubahan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, objectId, date]);

  useEffect(() => {
    load();
    window.addEventListener(KUOTA_CHANGED, load);
    return () => window.removeEventListener(KUOTA_CHANGED, load);
  }, [load]);

  if (!info || info.quota === null) return null;

  const changed = () => {
    window.dispatchEvent(new Event(KUOTA_CHANGED));
    router.refresh();
  };

  async function register(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const failure = await postVisit(target, date, party);
    setBusy(false);
    if (failure) return setError(failure);
    setFormOpen(false);
    changed();
  }

  async function cancel(id: string) {
    if (!confirm("Batalkan pendaftaran ini? Kuota akan dikembalikan.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/visits/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json.error ?? "Gagal membatalkan.");
      else changed();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  const v = info.visit;
  const active = v && v.status !== "CANCELLED";

  return (
    <div className="mt-3 space-y-2 rounded-[10px] border border-neutral-300 bg-neutral-50 p-3 text-sm">
      {v?.changeNotice && (
        <p role="alert" className="rounded-lg border border-amber-500 bg-amber-50 p-2 text-amber-900">
          ⚠ {v.status === "CANCELLED" ? "Dibatalkan pengelola" : "Ada perubahan"}: {v.changeNotice}
        </p>
      )}

      {active ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-emerald-800">
            {v.status === "ATTENDED" ? "Hadir ✓" : "Terdaftar ✓"} – {formatHariPanjang(v.date)}, {v.partySize} orang
          </p>
          {v.canCancel ? (
            <button type="button" disabled={busy} onClick={() => cancel(v.id)} className="rounded-lg border border-red-700 px-3 py-1 text-red-800 hover:bg-red-50 disabled:opacity-60">
              Batalkan
            </button>
          ) : (
            v.status === "BOOKED" && <span className="text-xs text-neutral-600">Pembatalan paling lambat H-1</span>
          )}
        </div>
      ) : formOpen ? (
        <form onSubmit={register} className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-medium">
            Tanggal
            <input type="date" required min={minDate} value={date} onChange={(e) => setDate(e.target.value)} className={`${field} mt-0.5 block`} />
          </label>
          <label className="text-xs font-medium">
            Jumlah orang
            <input
              type="number"
              required
              min={1}
              max={500}
              value={party}
              onChange={(e) => setParty(Math.max(1, Number(e.target.value) || 1))}
              className={`${field} mt-0.5 block w-24`}
            />
          </label>
          <button type="submit" disabled={busy || !info.open || (info.remaining ?? 0) < party} className="btn-primary px-4 py-1.5 text-sm disabled:opacity-60">
            {busy ? "Mendaftar..." : "Konfirmasi"}
          </button>
          <button type="button" onClick={() => setFormOpen(false)} className="px-2 py-1.5 text-sm text-neutral-700 underline">
            Batal
          </button>
          <p className="basis-full text-xs text-neutral-700">
            {!info.open
              ? "Tidak berlangsung / tutup pada tanggal ini. Pilih tanggal lain."
              : `Sisa ${info.remaining} slot pada ${formatHariPanjang(date)}.`}
          </p>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-neutral-700">
            {info.remaining === 0 ? <span className="font-semibold text-red-800">Kuota penuh</span> : <>Sisa <strong>{info.remaining}</strong> slot</>} ·{" "}
            {formatHariPanjang(date)}
          </p>
          <button type="button" onClick={() => setFormOpen(true)} className="rounded-lg bg-brand-green px-3 py-1 font-medium text-white hover:brightness-110">
            Daftarkan kunjungan
          </button>
        </div>
      )}
      {error && <p role="alert" className="text-red-700">{error}</p>}
    </div>
  );
}

/**
 * "Daftarkan semua": konfirmasi tanggal tiap tempat dan jumlah orang, lalu daftarkan satu per satu.
 * Tempat yang gagal (mis. kuota penuh) dilaporkan tanpa membatalkan yang berhasil.
 */
export function RegisterAll({
  items,
  defaultParty,
  minDate,
}: {
  items: ({ name: string; date: string } & VisitTargetProps)[];
  defaultParty: number;
  minDate: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dates, setDates] = useState<Record<string, string>>({});
  const [party, setParty] = useState(defaultParty);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ name: string; error: string | null }[] | null>(null);

  const pending = items.filter((it) => it.date >= minDate);
  if (pending.length === 0) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const out: { name: string; error: string | null }[] = [];
    for (const it of pending) {
      out.push({ name: it.name, error: await postVisit(it, dates[targetKey(it)] ?? it.date, party) });
    }
    setResults(out);
    setBusy(false);
    window.dispatchEvent(new Event(KUOTA_CHANGED));
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-brand-green px-4 py-2 text-sm font-medium text-brand-green hover:bg-brand-green/5">
        Daftarkan semua ({pending.length} tempat berkuota)
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="w-full max-w-xl space-y-3 rounded-[10px] border border-black bg-white p-4 text-left text-sm">
      <p className="font-semibold">Konfirmasi pendaftaran semua tempat berkuota</p>
      <ul className="space-y-2">
        {pending.map((it) => (
          <li key={targetKey(it)} className="flex flex-wrap items-center justify-between gap-2">
            <span>{it.name}</span>
            <input
              type="date"
              required
              min={minDate}
              value={dates[targetKey(it)] ?? it.date}
              onChange={(e) => setDates({ ...dates, [targetKey(it)]: e.target.value })}
              aria-label={`Tanggal kunjungan ${it.name}`}
              className={field}
            />
          </li>
        ))}
      </ul>
      <label className="flex items-center gap-2">
        Jumlah orang
        <input type="number" required min={1} max={500} value={party} onChange={(e) => setParty(Math.max(1, Number(e.target.value) || 1))} className={`${field} w-24`} />
      </label>
      {results && (
        <ul className="space-y-1">
          {results.map((r) => (
            <li key={r.name} className={r.error ? "text-red-700" : "text-emerald-800"}>
              {r.error ? `✗ ${r.name}: ${r.error}` : `✓ ${r.name} terdaftar`}
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn-primary px-4 py-1.5 text-sm disabled:opacity-60">
          {busy ? "Mendaftarkan..." : "Konfirmasi semua"}
        </button>
        <button type="button" onClick={() => { setOpen(false); setResults(null); }} className="px-2 text-sm underline">
          Tutup
        </button>
      </div>
    </form>
  );
}
