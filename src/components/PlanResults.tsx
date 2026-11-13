"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import VisitRegistration, { RegisterAll } from "@/components/VisitRegistration";
import { formatHariPanjang, hariIniJakarta } from "@/lib/tanggal";
import { formatRupiah, kindLabel, slotInfo } from "@/lib/culture";
import type { Plan } from "@/lib/planner";
import type { PlanInputBody } from "@/lib/validators";

const box = "rounded-[10px] border border-black bg-white p-3 text-center";

export default function PlanResults({ plans, input, isLoggedIn }: { plans: Plan[]; input: PlanInputBody; isLoggedIn: boolean }) {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plan = plans[active];
  const souvenirs = input.includeSouvenir ? (plan.souvenirs ?? []) : [];
  const party = input.adults + input.children;
  const today = hariIniJakarta();
  // Tempat / event berkuota di rencana ini (pendaftaran terpisah dari menyimpan rencana).
  const quotaItems = plan.days.flatMap((d) =>
    d.items.filter((it) => it.object.dailyQuota != null).map((it) => ({ ...(it.object.isEvent ? { eventId: it.object.id } : { objectId: it.object.id }), name: it.object.name, date: d.date })),
  );

  async function save() {
    setError(null);

    // Pengunjung belum masuk: bawa pilihan ke halaman masuk, lalu kembali ke halaman konfirmasi simpan.
    if (!isLoggedIn) {
      const data = encodeURIComponent(JSON.stringify({ style: plan.style, input }));
      router.push(`/masuk?next=${encodeURIComponent(`/rencana/simpan?data=${data}`)}`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: plan.style, input }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Gagal menyimpan rencana.");
        return;
      }
      router.push(`/trip/${json.id}`);
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="hasil-rencana" className="mx-auto mt-12 max-w-[1220px] bg-white/60 px-4 pb-8 pt-8 shadow-[0_4px_4px_rgba(0,0,0,0.25)] sm:px-[60px]">
      <h2 className="text-center font-serif text-3xl font-bold sm:text-[40px]">Pilihan Rencana Impian Anda !</h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-neutral-700">
        Tiga gaya perjalanan dari data budaya pilihanmu. Setiap tempat disertai alasan pemilihannya.
      </p>

      <div role="tablist" aria-label="Gaya rencana" className="mt-6 grid gap-3 sm:grid-cols-3">
        {plans.map((p, i) => (
          <button
            key={p.style}
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={`rounded-[10px] border border-black px-4 py-3 text-left transition ${
              active === i ? "bg-brand-green text-white" : "bg-white hover:bg-neutral-50"
            }`}
          >
            <span className="block text-lg font-semibold">{p.title}</span>
            <span className={`block text-sm ${active === i ? "text-white/90" : "text-neutral-600"}`}>{formatRupiah(p.total)}</span>
          </button>
        ))}
      </div>

      <p className="mt-4 text-center text-base text-neutral-800">{plan.description}</p>

      <dl className="mt-6 grid gap-3 sm:grid-cols-4">
        <div className={box}>
          <dt className="text-sm text-neutral-600">Perkiraan total</dt>
          <dd className="text-xl font-semibold">{formatRupiah(plan.total)}</dd>
        </div>
        <div className={box}>
          <dt className="text-sm text-neutral-600">{plan.remaining === null ? "Anggaran" : "Sisa anggaran"}</dt>
          <dd className="text-xl font-semibold">{plan.remaining === null ? "tidak diisi" : formatRupiah(plan.remaining)}</dd>
        </div>
        <div className={box}>
          <dt className="text-sm text-neutral-600">Ke pelaku budaya setempat</dt>
          <dd className="text-xl font-semibold">{formatRupiah(plan.impactIdr)}</dd>
          <dd className="text-xs text-neutral-600">{Math.round(plan.localShare * 100)}% dari tiket & kelas</dd>
        </div>
        <div className={box}>
          <dt className="text-sm text-neutral-600">Tempat kurang padat</dt>
          <dd className="text-xl font-semibold">
            {plan.hiddenGemCount} dari {plan.itemCount}
          </dd>
        </div>
      </dl>

      {plan.notes.length > 0 && (
        <ul className="mt-5 space-y-1 rounded-[10px] border border-amber-500 bg-amber-50 p-4 text-sm text-amber-900">
          {plan.notes.map((n, i) => (
            <li key={i}>• {n}</li>
          ))}
        </ul>
      )}

      {isLoggedIn && quotaItems.length > 0 && (
        <div className="mt-5 flex flex-col items-start gap-2">
          <p className="text-sm text-neutral-700">
            Menyimpan rencana tidak mendaftarkan kunjungan. Tempat berkuota perlu didaftarkan agar pengelola menyiapkan tempat untukmu.
          </p>
          <RegisterAll key={plan.style} items={quotaItems} defaultParty={party} minDate={today} />
        </div>
      )}

      <div className="mt-8 space-y-8">
        {plan.days.map((day) => (
          <div key={day.dayIndex}>
            <h3 className="font-serif text-2xl font-bold">
              Hari {day.dayIndex + 1} <span className="text-lg font-medium text-neutral-600">· {formatHariPanjang(day.date)}</span>
            </h3>
            {day.items.length === 0 ? (
              <p className="mt-3 rounded-[10px] border border-dashed border-neutral-500 p-4 text-sm text-neutral-700">
                Belum ada agenda. Coba tambah minat atau perbesar anggaran.
              </p>
            ) : (
              <ol className="mt-3 space-y-4">
                {day.items.map((raw) => {
                  const it = raw;
                  return (
                  <li key={it.object.id} className="rounded-[10px] border border-black bg-white p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-brand-brown">
                          {slotInfo[it.slot].label} ·{" "}
                          {it.object.isEvent && it.object.openTime ? it.object.openTime.replace(":", ".") : slotInfo[it.slot].start}
                        </p>
                        <Link href={it.object.isEvent ? `/jelajah/event/${it.object.slug}` : `/jelajah/${it.object.slug}`} target="_blank" className="text-xl font-semibold hover:underline">
                          {it.object.name}
                        </Link>
                        <p className="text-sm text-neutral-600">
                          {it.object.isEvent ? "Event budaya" : kindLabel[it.object.kind]} · {it.object.zone} · ±{it.object.durationMin} menit
                        </p>
                      </div>
                      <p className="text-lg font-semibold">{it.priceIdr === 0 ? "Gratis" : formatRupiah(it.priceIdr)}</p>
                    </div>

                    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Alasan rekomendasi">
                      {it.reasons.map((r) => (
                        <li key={r} className="rounded-full bg-brand-mist/40 px-3 py-1 text-xs">
                          {r}
                        </li>
                      ))}
                    </ul>

                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-semibold text-brand-link">Mengapa ini penting & etika berkunjung</summary>
                      <p className="mt-2 text-sm">{it.object.meaning}</p>
                      {it.object.etiquette.length > 0 && (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                          {it.object.etiquette.map((e) => (
                            <li key={e}>{e}</li>
                          ))}
                        </ul>
                      )}
                      {it.object.scheduleNote && <p className="mt-2 text-sm text-amber-800">Jadwal: {it.object.scheduleNote}</p>}
                    </details>
                    {isLoggedIn && it.object.dailyQuota != null && (
                      <VisitRegistration key={`${it.object.id}-${day.date}`} {...(it.object.isEvent ? { eventId: it.object.id } : { objectId: it.object.id })} defaultDate={day.date} defaultParty={party} minDate={today} />
                    )}
                  </li>
                  );
                })}
              </ol>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse border-2 border-black bg-white text-base">
          <caption className="bg-neutral-100 p-2 text-left font-semibold">Rincian perkiraan biaya</caption>
          <tbody>
            {[
              ["Tiket & kelas budaya", plan.costs.tickets],
              ["Makan (estimasi)", plan.costs.meals],
              ["Transportasi lokal (estimasi)", plan.costs.local],
              ["Penginapan (estimasi)", plan.costs.lodging],
            ].map(([label, value]) => (
              <tr key={label as string}>
                <td className="border border-black px-3 py-2">{label as string}</td>
                <td className="border border-black px-3 py-2 text-right">{formatRupiah(value as number)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="border border-black px-3 py-2">Total</td>
              <td className="border border-black px-3 py-2 text-right">{formatRupiah(plan.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {souvenirs.length > 0 && (
        <div className="mt-8">
          <h3 className="font-serif text-2xl font-bold">
            Sisa {formatRupiah(plan.souvenirAllowance)} untuk Oleh-oleh
          </h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {souvenirs.map((s) => (
              <li key={s.id} className="rounded-[10px] border border-black bg-white p-3">
                <p className="font-semibold">{s.name}</p>
                <p className="text-sm text-neutral-600">
                  {s.umkm} · {formatRupiah(s.price)}
                </p>
                <p className="mt-1 text-sm">{s.story}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 text-xs text-neutral-600">
        Harga dan jadwal dapat berubah. Selalu konfirmasi ke pengelola sebelum berangkat.
      </p>

      <div className="mt-6 flex flex-col items-end gap-2">
        <button type="button" onClick={save} disabled={saving || plan.itemCount === 0} className="btn-primary h-[47px] w-[220px] text-xl">
          {saving ? "Menyimpan..." : "Simpan Rencana"}
        </button>
        {!isLoggedIn && <p className="text-sm text-neutral-700">Masuk atau daftar untuk menyimpan rencana ini ke My Trip.</p>}
        <p className="text-xs text-neutral-600">KalcerPlanner tidak memproses pembayaran; pesan langsung ke pengelola.</p>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
