"use client";

import { FormEvent, useRef, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import PlanResults from "@/components/PlanResults";
import {
  DEPTHS,
  INTERESTS,
  LODGINGS,
  PACES,
  TRANSPORTS,
  depthInfo,
  formatRupiah,
  interestInfo,
  lodgingInfo,
  paceInfo,
  transportInfo,
  type Depth,
  type Interest,
  type Lodging,
  type Pace,
  type Transport,
} from "@/lib/culture";
import { hariIniJakarta } from "@/lib/tanggal";
import type { Plan } from "@/lib/planner";
import type { PlanInputBody } from "@/lib/validators";

export type RencanaInitial = {
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  budget: string; // digits only
  interests: Interest[];
  zone: string;
};

const STEP_LABELS = ["Tujuan & Tanggal", "Preferensi Budaya", "Akomodasi & Transportasi", "Hasil Itinerary"] as const;
const MAX_DAYS = 7;

const inputClass =
  "h-12 w-full rounded-lg border border-neutral-300 bg-white px-4 text-base outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/30 disabled:bg-neutral-100";
const legendClass = "font-serif text-xl font-bold";
const hintClass = "text-sm text-neutral-600";

/** Satu opsi berbentuk lingkaran: centang untuk pilihan ganda, titik untuk pilihan tunggal. */
function Choice({
  type,
  checked,
  onClick,
  label,
  hint,
}: {
  type: "radio" | "checkbox";
  checked: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role={type}
      aria-checked={checked}
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-neutral-50"
    >
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
          checked ? "border-brand-green bg-brand-green text-white" : "border-neutral-400 bg-white"
        }`}
      >
        {checked && (type === "checkbox" ? <Check size={14} strokeWidth={3} /> : <span className="h-2 w-2 rounded-full bg-white" />)}
      </span>
      <span>
        <span className="block text-lg font-medium leading-snug">{label}</span>
        {hint && <span className={`block ${hintClass}`}>{hint}</span>}
      </span>
    </button>
  );
}

function NumberStepper({
  label,
  value,
  min,
  max = 20,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  onChange: (n: number) => void;
}) {
  const btn =
    "flex h-10 w-10 items-center justify-center rounded-full border border-neutral-400 hover:bg-neutral-50 disabled:opacity-40";
  return (
    <div className="inline-flex items-center gap-4">
      <button type="button" aria-label={`Kurangi ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className={btn}>
        <Minus size={18} />
      </button>
      <span aria-label={label} className="w-8 text-center text-xl font-semibold">
        {value}
      </span>
      <button type="button" aria-label={`Tambah ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className={btn}>
        <Plus size={18} />
      </button>
    </div>
  );
}

function RupiahField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="flex h-12 max-w-sm">
      <span className="flex w-14 items-center justify-center rounded-l-lg border border-neutral-300 bg-neutral-100 font-medium">Rp.</span>
      <input
        inputMode="numeric"
        value={value ? Number(value).toLocaleString("id-ID") : ""}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
        placeholder={placeholder}
        aria-label={label}
        className="min-w-0 flex-1 rounded-r-lg border border-l-0 border-neutral-300 bg-white px-4 text-base outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/30"
      />
    </div>
  );
}

export default function RencanaBuilder({
  initial,
  isLoggedIn,
  zones,
}: {
  initial: RencanaInitial;
  isLoggedIn: boolean;
  zones: string[];
}) {
  const topRef = useRef<HTMLDivElement>(null);
  const today = hariIniJakarta();

  const [step, setStep] = useState(1);

  // 1. Tujuan & tanggal
  const [origin, setOrigin] = useState("");
  const [zone, setZone] = useState(initial.zone);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);

  // 2. Preferensi budaya
  const [selected, setSelected] = useState<Interest[]>(initial.interests);
  const [depth, setDepth] = useState<Depth>("BELAJAR");
  const [pace, setPace] = useState<Pace>("SEIMBANG");
  const [spread, setSpread] = useState(false);

  // 3. Akomodasi & transportasi
  const [budget, setBudget] = useState(initial.budget);
  const [includeMeals, setIncludeMeals] = useState(true);
  const [includeSouvenir, setIncludeSouvenir] = useState(true);
  const [lodging, setLodging] = useState<Lodging>("STANDAR");
  const [rooms, setRooms] = useState(1);
  const [transport, setTransport] = useState<Transport>("UMUM");
  const [adults, setAdults] = useState(initial.adults);
  const [children, setChildren] = useState(initial.children);

  // hasil
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [submitted, setSubmitted] = useState<PlanInputBody | null>(null);

  const rawDays =
    startDate && endDate
      ? Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000) + 1
      : 0;
  const durationText = rawDays > 0 ? `${rawDays} hari ${rawDays - 1} malam` : "—";

  function step1Error(): string | null {
    if (!origin) return "Masukkan kota asal anda";
    if (!zone) return "Pilih kota tujuan.";
    if (!startDate || !endDate) return "Isi tanggal berangkat dan tanggal pulang.";
    if (startDate < today) return "Tanggal berangkat tidak boleh sebelum hari ini.";
    if (endDate < startDate) return "Tanggal pulang tidak boleh sebelum tanggal berangkat.";
    // if (rawDays > MAX_DAYS) return `Rencana mendukung maksimal ${MAX_DAYS} hari.`;
    return null;
  }

  function budgetError(): string | null {
    if (!budget || Number(budget) <= 0) return "Total anggaran wajib diisi dan harus lebih dari 0.";
    return null;
  }

  function goTo(n: number) {
    setError(null);
    setStep(n);
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  }

  function toggleInterest(value: Interest) {
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  async function submitPlan() {
    const problem = step1Error();
    if (problem) {
      setError(problem);
      setStep(1);
      return;
    }

    const budgetProblem = budgetError();
    if (budgetProblem) {
      setError(budgetProblem);
      return;
    }

    const payload = {
      startDate,
      endDate,
      adults,
      children,
      budget: Number(budget),
      originCost: 0,
      lodging,
      rooms,
      includeSouvenir,
      includeMeals,
      transport,
      interests: selected,
      depth,
      pace,
      spreadTourism: spread,
      zone: zone || undefined,
    } satisfies PlanInputBody;

    setLoading(true);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Terjadi kesalahan. Coba lagi.");
        return;
      }
      setPlans(json.plans as Plan[]);
      setSubmitted(payload);
      goTo(4);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (step === 1) {
      const problem = step1Error();
      if (problem) {
        setError(problem);
        return;
      }
      goTo(2);
    } else if (step === 2) {
      goTo(3);
    } else if (step === 3) {
      void submitPlan();
    }
  }

  const prim =
    "inline-flex h-12 items-center justify-center rounded-lg bg-brand-green px-8 text-lg font-semibold text-white transition hover:brightness-110 disabled:opacity-60";
  const sec =
    "inline-flex h-12 items-center justify-center rounded-lg border border-neutral-400 bg-white px-8 text-lg font-semibold transition hover:bg-neutral-50";

  return (
    <div className="px-4 pb-20 pt-6 sm:px-8">
      <div ref={topRef} className="mx-auto max-w-[900px] scroll-mt-28 rounded-2xl border border-neutral-200 bg-white px-5 pb-10 pt-8 shadow-sm sm:px-10">
        <h1 className="text-center font-serif text-3xl font-bold sm:text-[40px]">Rencanakan Perjalanan Budaya Anda</h1>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-neutral-600">
          (Isi Detail Perjalanan Anda)
        </p>

        {/* Penanda langkah */}
        <ol className="mx-auto mt-8 flex max-w-3xl items-start justify-between" aria-label="Langkah pengisian">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const active = n === step;
            const done = n < step;
            const reachable = n < step || (n === 4 && plans !== null);
            return (
              <li key={label} className="flex flex-1 items-start last:flex-none">
                <button
                  type="button"
                  disabled={!reachable && !active}
                  onClick={() => reachable && goTo(n)}
                  aria-current={active ? "step" : undefined}
                  className="flex w-20 flex-col items-center gap-2 text-center sm:w-28"
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-base font-semibold ${
                      active
                        ? "border-brand-green bg-brand-green text-white"
                        : done
                          ? "border-brand-green bg-white text-brand-green"
                          : "border-neutral-300 bg-white text-neutral-500"
                    }`}
                  >
                    {done ? <Check size={18} strokeWidth={3} /> : n}
                  </span>
                  <span className={`text-xs leading-tight sm:text-sm ${active ? "font-semibold" : "text-neutral-600"}`}>{label}</span>
                </button>
                {n < STEP_LABELS.length && <span aria-hidden className={`mt-5 h-0.5 flex-1 ${done ? "bg-brand-green" : "bg-neutral-300"}`} />}
              </li>
            );
          })}
        </ol>

        <form onSubmit={onSubmit} noValidate className="mt-10">
          {/* 1. Tujuan & tanggal */}
          {step === 1 && (
            <section className="space-y-8">
              <h2 className="font-serif text-2xl font-bold">1. Tujuan &amp; tanggal</h2>

              <div className="grid gap-6 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className={legendClass}>Kota asal</span>
                  <input
                    type="text"
                    value={origin}
                    maxLength={60}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="Masukkan kota asal Anda"
                    className={inputClass}
                  />
                  {/* <span className={hintClass}>Opsional. Hanya untuk ringkasan, belum memengaruhi rekomendasi.</span> */}
                </label>

                <label className="flex flex-col gap-2">
                  <span className={legendClass}>Kota tujuan</span>
                  <select value={zone} onChange={(e) => setZone(e.target.value)} disabled={zones.length === 0} className={`${inputClass} select-arrow`}>
                    <option value="">Pilih kota tujuan</option>
                    {zones.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                  {/* <span className={hintClass}>
                    {zones.length === 0
                      ? "Data budaya belum tersedia. Jalankan seed database (npm run db:seed)."
                      : "Pilihan berasal dari data budaya yang tersedia."}
                  </span> */}
                </label>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className={legendClass}>Tanggal berangkat</span>
                  <input type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
                </label>
                <label className="flex flex-col gap-2">
                  <span className={legendClass}>Tanggal pulang</span>
                  <input type="date" min={startDate || today} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
                </label>
              </div>

              <p className="text-lg">
                <span className="font-semibold">Durasi:</span> {durationText}
                {/* <span className={`ml-2 ${hintClass}`}>(dihitung dari tanggal, maksimal {MAX_DAYS} hari)</span> */}
              </p>
            </section>
          )}

          {/* 2. Preferensi budaya */}
          {step === 2 && (
            <section className="space-y-8">
              <h2 className="font-serif text-2xl font-bold">2. Preferensi budaya</h2>

              <fieldset>
                <legend className={legendClass}>Minat budaya (bisa pilih lebih dari satu)</legend>
                <p className={`mt-1 ${hintClass}`}>Kosongkan jika ingin dipilihkan.</p>
                <div role="group" aria-label="Minat budaya" className="mt-3 grid gap-x-6 sm:grid-cols-2">
                  {INTERESTS.map((i) => (
                    <Choice
                      key={i}
                      type="checkbox"
                      checked={selected.includes(i)}
                      onClick={() => toggleInterest(i)}
                      label={interestInfo[i].label}
                      hint={interestInfo[i].hint}
                    />
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className={legendClass}>Kedalaman pengalaman</legend>
                <div role="radiogroup" aria-label="Kedalaman pengalaman" className="mt-3">
                  {DEPTHS.map((d) => (
                    <Choice key={d} type="radio" checked={depth === d} onClick={() => setDepth(d)} label={depthInfo[d].label} hint={depthInfo[d].hint} />
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className={legendClass}>Tempo perjalanan</legend>
                <div role="radiogroup" aria-label="Tempo perjalanan" className="mt-3">
                  {PACES.map((p) => (
                    <Choice key={p} type="radio" checked={pace === p} onClick={() => setPace(p)} label={`${paceInfo[p].label} — ${paceInfo[p].hint.charAt(0).toLowerCase()}${paceInfo[p].hint.slice(1)}`} />
                  ))}
                </div>
              </fieldset>

              <Choice
                type="checkbox"
                checked={spread}
                onClick={() => setSpread((v) => !v)}
                label="Prioritaskan tempat yang kurang padat"
                hint="Membantu menyebar kunjungan ke kampung dan situs yang jarang disinggahi, bukan hanya destinasi terkenal."
              />
            </section>
          )}

          {/* 3. Akomodasi & transportasi */}
          {step === 3 && (
            <section className="space-y-8">
              <h2 className="font-serif text-2xl font-bold">3. Akomodasi &amp; transportasi</h2>

              <fieldset>
                <legend className={legendClass}>
                  Total anggaran <span className="text-red-600">*</span>
                </legend>
                <p className={`mt-1 ${hintClass}`}>Anggaran selama di kota tujuan. Wajib diisi.</p>
                <div className="mt-3">
                  <RupiahField value={budget} onChange={setBudget} placeholder="6.000.000" label="Total anggaran dalam rupiah" />
                </div>
                <div className="mt-3">
                  <Choice type="checkbox" checked={includeMeals} onClick={() => setIncludeMeals((v) => !v)} label="Anggaran sudah termasuk makan" />
                  <Choice type="checkbox" checked={includeSouvenir} onClick={() => setIncludeSouvenir((v) => !v)} label="Anggaran sudah termasuk oleh-oleh" />
                </div>
              </fieldset>

              <fieldset>
                <legend className={legendClass}>Penginapan</legend>
                <div role="radiogroup" aria-label="Penginapan" className="mt-3">
                  {LODGINGS.map((l) => (
                    <Choice
                      key={l}
                      type="radio"
                      checked={lodging === l}
                      onClick={() => setLodging(l)}
                      label={l === "NONE" ? "Sudah ada / tidak perlu penginapan" : `Perlu penginapan — ${lodgingInfo[l].label}`}
                      hint={
                        l === "NONE"
                          ? "Tidak dihitung dalam biaya"
                          : `${lodgingInfo[l].hint} · perkiraan ${formatRupiah(lodgingInfo[l].perRoomNight)} per kamar per malam`
                      }
                    />
                  ))}
                </div>
                {lodging !== "NONE" && (
                  <div className="mt-3 flex items-center gap-4 px-2">
                    <span className="text-lg font-medium">Jumlah kamar</span>
                    <NumberStepper label="jumlah kamar" value={rooms} min={1} onChange={setRooms} />
                  </div>
                )}
              </fieldset>

              <fieldset>
                <legend className={legendClass}>Moda transportasi di kota tujuan</legend>
                <div role="radiogroup" aria-label="Moda transportasi di kota tujuan" className="mt-3">
                  {TRANSPORTS.map((t) => (
                    <Choice
                      key={t}
                      type="radio"
                      checked={transport === t}
                      onClick={() => setTransport(t)}
                      label={transportInfo[t].label}
                      hint={
                        t === "NONE"
                          ? transportInfo[t].hint
                          : `${transportInfo[t].hint} · perkiraan ${formatRupiah(transportInfo[t].perDay)} per hari`
                      }
                    />
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className={legendClass}>Jumlah peserta</legend>
                <div className="mt-3 flex flex-wrap items-center gap-x-10 gap-y-4 px-2">
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-medium">Dewasa</span>
                    <NumberStepper label="dewasa" value={adults} min={1} onChange={setAdults} />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-medium">Anak</span>
                    <NumberStepper label="anak" value={children} min={0} onChange={setChildren} />
                  </div>
                </div>
              </fieldset>
            </section>
          )}

          {/* 4. Hasil itinerary */}
          {step === 4 && plans && submitted && (
            <section className="space-y-6">
              <h2 className="font-serif text-2xl font-bold">4. Hasil itinerary</h2>
              <p className="text-neutral-700">
                {origin.trim() ? `${origin.trim()} → ` : ""}
                {zone || "Semua wilayah"} · {durationText} · {adults} dewasa
                {children > 0 ? `, ${children} anak` : ""}
              </p>
            </section>
          )}

          {error && (
            <p role="alert" className="mt-6 text-base font-medium text-red-700">
              {error}
            </p>
          )}

          {/* Navigasi */}
          {step < 4 ? (
            <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              {step > 1 ? (
                <button type="button" onClick={() => goTo(step - 1)} className={sec}>
                  Kembali
                </button>
              ) : (
                <span />
              )}
              <button type="submit" disabled={loading} className={prim}>
                {step === 3 ? (loading ? "Memproses..." : "Cek Rekomendasi") : "Lanjut"}
              </button>
            </div>
          ) : (
            <div className="mt-6">
              <button type="button" onClick={() => goTo(3)} className={sec}>
                Ubah isian
              </button>
            </div>
          )}

        </form>
      </div>

      {step === 4 && plans && submitted && <PlanResults plans={plans} input={submitted} isLoggedIn={isLoggedIn} />}
    </div>
  );
}
