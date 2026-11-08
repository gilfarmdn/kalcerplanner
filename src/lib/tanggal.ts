// Pemformat tanggal berbahasa Indonesia (tanpa dependensi terjemahan). Tanggal diperlakukan sebagai hari UTC.

const toDate = (d: Date | string) => (typeof d === "string" ? new Date(`${d.slice(0, 10)}T00:00:00.000Z`) : d);

const shortFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const longFmt = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Contoh: "Rabu, 11 November 2026". */
export const formatHariPanjang = (d: Date | string) => longFmt.format(toDate(d));

/** Contoh: "11 Nov 2026 – 13 Nov 2026" (satu tanggal bila awal = akhir). */
export function formatRentang(start: Date | string, end: Date | string) {
  const s = toDate(start);
  const e = toDate(end);
  return s.getTime() === e.getTime() ? shortFmt.format(s) : `${shortFmt.format(s)} – ${shortFmt.format(e)}`;
}

/** 'YYYY-MM-DD' -> Date UTC tengah malam. */
export const toDay = (s: string) => new Date(`${s}T00:00:00.000Z`);
/** Date -> 'YYYY-MM-DD' (hari UTC). */
export const dayString = (d: Date) => d.toISOString().slice(0, 10);

/** Hari ini (YYYY-MM-DD) menurut waktu Jakarta. */
export const hariIniJakarta = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
