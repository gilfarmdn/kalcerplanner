"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import LocationPicker, { type LatLng } from "@/components/pelaku/LocationPicker";
import RecurrenceFields, { type RecurrenceValue } from "@/components/pelaku/RecurrenceFields";
import { uploadObjectPhoto } from "@/lib/image-client";
import {
  DEPTHS,
  INTERESTS,
  OBJECT_KINDS,
  SLOTS,
  ZONES,
  depthInfo,
  interestInfo,
  kindLabel,
  slotInfo,
  weekdayNames,
  type Depth,
  type Interest,
  type ObjectKind,
  type Slot,
} from "@/lib/culture";

const input = "w-full rounded-lg border border-[#2c2c2c] bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-brand-link";

export type ObjectFormValues = {
  id: string;
  name: string;
  kind: ObjectKind;
  interest: Interest;
  zone: string;
  address: string | null;
  lat: number;
  lng: number;
  imageUrl?: string | null;
  summary: string;
  meaning: string;
  etiquette: string[];
  priceIdr: number;
  childPriceIdr?: number | null;
  dailyQuota?: number | null;
  durationMin: number;
  depth: Depth;
  slots: Slot[];
  weekdays: number[];
  openTime: string | null;
  closeTime: string | null;
  scheduleNote: string | null;
};

const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 0]; // Senin dulu, Minggu terakhir

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** Event tidak masuk planner; slot cukup diturunkan dari jam mulai acara. */
function slotFromTime(t: string): Slot {
  const min = toMin(t);
  if (min < 12 * 60) return "PAGI";
  if (min < 15 * 60) return "SIANG";
  if (min < 18 * 60) return "SORE";
  return "MALAM";
}

/**
 * Form destinasi budaya. Tanpa `object` = menambah (POST /api/objects); dengan `object` = mengubah.
 * Data tampil setelah diverifikasi kurator.
 */
export default function ObjectForm({ object }: { object?: ObjectFormValues }) {
  const router = useRouter();
  const editing = !!object;
  const photoRequired = !editing;
  const [slots, setSlots] = useState<Slot[]>(object?.slots.length ? object.slots : ["PAGI"]);
  // Data lama: weekdays kosong berarti setiap hari, jadi semua hari tercentang.
  const [weekdays, setWeekdays] = useState<number[]>(object?.weekdays.length ? object.weekdays : ALL_WEEKDAYS);
  const [point, setPoint] = useState<LatLng | null>(object ? { lat: object.lat, lng: object.lng } : null);
  const [busy, setBusy] = useState(false);
  const [isEvent, setIsEvent] = useState(false);
  const [rec, setRec] = useState<RecurrenceValue>({ recurrence: "ONCE", weekdays: [], exceptDates: [] });
  const [hasChildPrice, setHasChildPrice] = useState(object?.childPriceIdr != null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const num = (k: string) => Number(String(f.get(k) ?? "").replace(",", "."));
    if (!point) {
      setMessage({ ok: false, text: "Pilih lokasi pada peta terlebih dahulu." });
      return;
    }
    const openTime = String(f.get("openTime") ?? "");
    const closeTime = String(f.get("closeTime") ?? "");
    if (isEvent && rec.recurrence === "WEEKLY" && rec.weekdays.length === 0) {
      setMessage({ ok: false, text: "Pilih minimal satu hari berlangsung." });
      return;
    }
    if (!isEvent && weekdays.length === 0) {
      setMessage({ ok: false, text: "Pilih minimal satu hari kunjungan." });
      return;
    }
    if (closeTime <= openTime) {
      setMessage({ ok: false, text: isEvent ? "Jam selesai harus setelah jam mulai." : "Jam tutup harus setelah jam buka." });
      return;
    }
    const pickedPhoto = f.get("photo");
    if (photoRequired && !(pickedPhoto instanceof File && pickedPhoto.size > 0)) {
      setMessage({ ok: false, text: isEvent ? "Pilih foto event terlebih dahulu." : "Pilih foto destinasi terlebih dahulu." });
      return;
    }
    // Field khusus planner disembunyikan untuk event; nilainya diturunkan dari jadwal event.
    const planner = isEvent
      ? {
          durationMin: Math.min(480, Math.max(15, toMin(closeTime) - toMin(openTime))),
          depth: "LIHAT",
          slots: [slotFromTime(openTime)],
          weekdays: rec.recurrence === "WEEKLY" ? rec.weekdays : ALL_WEEKDAYS,
        }
      : { durationMin: num("durationMin") || 90, depth: f.get("depth"), slots, weekdays };
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(editing ? `/api/pelaku/destinasi/${object!.id}` : "/api/objects", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          kind: f.get("kind"),
          interest: f.get("interest"),
          zone: f.get("zone"),
          lat: point.lat,
          lng: point.lng,
          summary: f.get("summary"),
          meaning: f.get("meaning"),
          etiquette: f.get("etiquette") ?? "",
          priceIdr: num("priceIdr") || 0,
          childPriceIdr: hasChildPrice ? num("childPriceIdr") || 0 : null,
          dailyQuota: String(f.get("dailyQuota") ?? "").trim() ? num("dailyQuota") : null,
          ...planner,
          openTime,
          closeTime,
          scheduleNote: f.get("scheduleNote") || undefined,
          ...(editing
            ? {}
            : {
                isEvent,
                eventStartsOn: isEvent ? f.get("eventStartsOn") || undefined : undefined,
                eventEndsOn: isEvent ? f.get("eventEndsOn") || undefined : undefined,
                eventRecurrence: rec.recurrence,
                eventWeekdays: rec.weekdays,
                eventExceptDates: rec.exceptDates,
              }),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ ok: false, text: json.error ?? "Gagal menyimpan." });
        return;
      }
      if (!editing) {
        // Foto (wajib untuk pelaku) diunggah setelah destinasi tersimpan. Bila gagal, destinasi tetap ada dan foto bisa diunggah di halaman detail.
        if (pickedPhoto instanceof File && pickedPhoto.size > 0) {
          try {
            await uploadObjectPhoto(json.id, pickedPhoto);
          } catch (photoError) {
            setMessage({
              ok: false,
              text: `Destinasi tersimpan, tetapi foto gagal diunggah: ${photoError instanceof Error ? photoError.message : "galat"}. Unggah ulang di halaman detail.`,
            });
            router.push(`/destinasi/${json.id}`);
            router.refresh();
            return;
          }
        }
      }
      if (editing) {
        setMessage({
          ok: true,
          text: "Perubahan tersimpan. Data akan dicek ulang kurator sebelum tampil kembali.",
        });
        router.refresh();
      } else {
        router.push("/destinasi");
        router.refresh();
      }
    } catch {
      setMessage({ ok: false, text: "Tidak dapat terhubung ke server." });
    } finally {
      setBusy(false);
    }
  }

  const toggleSlot = (s: Slot) => setSlots((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  const toggleWeekday = (w: number) => setWeekdays((p) => (p.includes(w) ? p.filter((x) => x !== w) : [...p, w]));

  const timeFields = (
    <>
      <label className="text-sm font-medium">
        {isEvent ? "Jam mulai acara (WIB)" : "Jam buka (WIB)"}
        <input name="openTime" type="time" required defaultValue={object?.openTime ?? "08:00"} className={`${input} mt-1`} />
      </label>
      <label className="text-sm font-medium">
        {isEvent ? "Jam selesai acara (WIB)" : "Jam tutup (WIB)"}
        <input name="closeTime" type="time" required defaultValue={object?.closeTime ?? "16:00"} className={`${input} mt-1`} />
      </label>
    </>
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-[10px] border border-neutral-300 bg-white p-5 sm:grid-cols-2">
      {!editing && (
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium">Yang ingin kamu tambahkan</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {[
              { value: false, title: "Objek Budaya", hint: "Tempat yang bisa dikunjungi kapan saja: situs, museum, sanggar, kuliner." },
              { value: true, title: "Event Budaya", hint: "Acara bertanggal: festival, pentas, upacara. Tampil di Kalender Budaya." },
            ].map((o) => (
              <label
                key={o.title}
                className={`cursor-pointer rounded-lg border p-3 text-sm ${isEvent === o.value ? "border-brand-green bg-brand-mist/40" : "border-[#2c2c2c]"}`}
              >
                <input type="radio" name="tipe" className="sr-only" checked={isEvent === o.value} onChange={() => setIsEvent(o.value)} />
                <span className="block font-semibold">{o.title}</span>
                <span className="block text-xs font-normal text-neutral-700">{o.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <label className="text-sm font-medium sm:col-span-2">
        {isEvent ? "Nama event" : "Nama tempat / kegiatan"}
        <input name="name" required minLength={3} maxLength={120} defaultValue={object?.name} className={`${input} mt-1`} />
      </label>

      {isEvent && (
        <fieldset className="grid gap-4 rounded-lg border border-dashed border-brand-green p-4 sm:col-span-2 sm:grid-cols-2">
          <legend className="px-1 text-sm font-medium">Jadwal event</legend>
          <RecurrenceFields value={rec} onChange={setRec} />
          <label className="text-sm font-medium">
            {rec.recurrence === "WEEKLY" ? "Berlaku mulai" : "Tanggal mulai"}
            <input name="eventStartsOn" type="date" required className={`${input} mt-1`} />
          </label>
          <label className="text-sm font-medium">
            {rec.recurrence === "WEEKLY" ? "Berlaku sampai (kosong = tanpa batas)" : "Tanggal selesai (kosong = 1 hari)"}
            <input name="eventEndsOn" type="date" className={`${input} mt-1`} />
          </label>
          {timeFields}
        </fieldset>
      )}

      <label className="text-sm font-medium">
        Jenis
        <select name="kind" required defaultValue={object?.kind ?? ""} className={`${input} select-arrow mt-1`}>
          <option value="" disabled>
            Pilih jenis
          </option>
          {OBJECT_KINDS.map((k) => (
            <option key={k} value={k}>
              {kindLabel[k]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Tema budaya utama
        <select name="interest" required defaultValue={object?.interest ?? ""} className={`${input} select-arrow mt-1`}>
          <option value="" disabled>
            Pilih tema budaya
          </option>
          {INTERESTS.map((i) => (
            <option key={i} value={i}>
              {interestInfo[i].label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium sm:col-span-2">
        Wilayah (kabupaten / kota)
        <input
          name="zone"
          required
          list="zona-saran"
          minLength={2}
          maxLength={60}
          defaultValue={object?.zone}
          className={`${input} mt-1`}
        />
        {/* <datalist id="zona-saran">
          {ZONES.map((z) => (
            <option key={z} value={z} />
          ))}
        </datalist> */}
      </label>

      <div className="text-sm font-medium sm:col-span-2">
        Lokasi di peta
        <div className="mt-1">
          <LocationPicker value={point} onChange={setPoint} />
        </div>
      </div>

      <label className="text-sm font-medium sm:col-span-2">
        Ringkasan (1–2 kalimat)
        <textarea name="summary" required minLength={20} maxLength={240} defaultValue={object?.summary} className={`${input} mt-1`} />
      </label>
      <label className="text-sm font-medium sm:col-span-2">
        Mengapa ini penting? (makna budaya)
        <textarea name="meaning" required minLength={40} maxLength={1200} rows={4} defaultValue={object?.meaning} className={`${input} mt-1`} />
      </label>
      <label className="text-sm font-medium sm:col-span-2">
        {isEvent ? "Etika menghadiri acara" : "Etika berkunjung"}
        <textarea
          name="etiquette"
          rows={3}
          maxLength={1500}
          placeholder={"Berpakaian sopan\nMinta izin sebelum memotret"}
          defaultValue={object?.etiquette.join("\n")}
          className={`${input} mt-1`}
        />
      </label>

      <label className="text-sm font-medium">
        {isEvent ? "Harga tiket dewasa (Rp, 0 = gratis)" : "Harga per orang dewasa (Rp, 0 = gratis)"}
        <input name="priceIdr" type="number" min={0} max={5000000} step={1000} defaultValue={object?.priceIdr ?? 0} className={`${input} mt-1`} />
      </label>
      <div className="text-sm font-medium">
        <label className="inline-flex items-center gap-2 font-normal">
          <input type="checkbox" checked={hasChildPrice} onChange={(e) => setHasChildPrice(e.target.checked)} />
          Ada harga khusus anak
        </label>
        {hasChildPrice ? (
          <label className="mt-2 block">
            Harga per anak (Rp, 0 = gratis)
            <input name="childPriceIdr" type="number" required min={0} max={5000000} step={1000} defaultValue={object?.childPriceIdr ?? 0} className={`${input} mt-1`} />
          </label>
        ) : (
          <p className="mt-1 text-xs font-normal text-neutral-600">Tanpa harga khusus, tiket anak sama dengan harga dewasa.</p>
        )}
      </div>
      <label className="text-sm font-medium sm:col-span-2">
        {isEvent ? "Kuota peserta per tanggal acara (opsional)" : "Kuota pengunjung per hari (opsional)"}
        <input
          name="dailyQuota"
          type="number"
          min={1}
          max={100000}
          step={1}
          defaultValue={object?.dailyQuota ?? ""}
          placeholder="Kosongkan bila pengunjung tidak perlu mendaftar"
          className={`${input} mt-1`}
        />
        <span className="mt-1 block text-xs font-normal text-neutral-600">
          Bila diisi, wisatawan bisa mendaftarkan kunjungan dan melihat sisa kuota. Pendaftaran yang masuk tampil di Riwayat Kunjungan.
        </span>
      </label>
      {!isEvent && (
        <>
          <label className="text-sm font-medium">
            Lama kunjungan (menit)
            <input name="durationMin" type="number" min={15} max={480} step={15} defaultValue={object?.durationMin ?? 90} className={`${input} mt-1`} />
          </label>

          <label className="text-sm font-medium">
            Kedalaman pengalaman
            <select name="depth" defaultValue={object?.depth ?? "BELAJAR"} className={`${input} select-arrow mt-1`}>
              {DEPTHS.map((d) => (
                <option key={d} value={d}>
                  {depthInfo[d].label} — {depthInfo[d].hint}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="text-sm font-medium">
            <legend>Waktu yang tersedia</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {SLOTS.map((s) => (
                <label key={s} className="inline-flex items-center gap-1 font-normal">
                  <input type="checkbox" checked={slots.includes(s)} onChange={() => toggleSlot(s)} />
                  {slotInfo[s].label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="text-sm font-medium sm:col-span-2">
            <legend>Hari bisa dikunjungi</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {ALL_WEEKDAYS.map((w) => (
                <label key={w} className="inline-flex items-center gap-1 font-normal">
                  <input type="checkbox" checked={weekdays.includes(w)} onChange={() => toggleWeekday(w)} />
                  {weekdayNames[w]}
                </label>
              ))}
            </div>
          </fieldset>
          {timeFields}
        </>
      )}

      <label className="text-sm font-medium sm:col-span-2">
        Catatan jadwal (opsional)
        <input
          name="scheduleNote"
          maxLength={240}
          placeholder={isEvent ? "Mis. Mengikuti kalender Jawa; tanggal bisa bergeser" : "Mis. Kunjungan dengan janji; tutup hari Senin"}
          defaultValue={object?.scheduleNote ?? ""}
          className={`${input} mt-1`}
        />
      </label>

      {!editing && (
        <label className="text-sm font-medium sm:col-span-2">
          {photoRequired ? "Foto" : "Foto (opsional)"}
          <input name="photo" type="file" required={photoRequired} accept="image/jpeg,image/png,image/webp" className={`${input} mt-1`} />
          <span className="mt-1 block text-xs font-normal text-neutral-600">
            {photoRequired
              ? "JPG, PNG, atau WebP; otomatis dikecilkan."
              : "JPG, PNG, atau WebP; otomatis dikecilkan. Bisa juga diunggah nanti di halaman detail."}
          </span>
        </label>
      )}

      {message && (
        <p role={message.ok ? "status" : "alert"} className={`text-sm sm:col-span-2 ${message.ok ? "text-emerald-700" : "text-red-700"}`}>
          {message.text}
        </p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={busy || (!isEvent && (slots.length === 0 || weekdays.length === 0))}
          className="h-10 rounded-lg bg-brand-green px-6 text-base font-medium text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Menyimpan..." : editing ? "Simpan perubahan" : "Ajukan untuk verifikasi"}
        </button>
      </div>
    </form>
  );
}
