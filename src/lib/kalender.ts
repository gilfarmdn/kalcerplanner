// Logika kalender budaya (murni TypeScript, tanpa dependensi framework). Semua tanggal berbentuk "YYYY-MM-DD".

export type CalEvent = {
  id: string;
  title: string;
  zone: string;
  description: string;
  location: string | null;
  objectSlug: string | null;
  /** Tautan detail (event mandiri atau destinasi terkait); null = tanpa tautan. */
  href?: string | null;
  startsOn: string | null;
  endsOn: string | null;
  repeatsYearly: boolean;
  weekdays: number[];
  exceptDates: string[];
  monthHint: number | null;
  dateNote: string;
  imageUrl: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** month = 0..11 */
const toYmd = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

export const weekdayOf = (ymd: string) => new Date(`${ymd}T00:00:00Z`).getUTCDay();

/** Sel kalender sebulan penuh: null untuk sel kosong di awal/akhir, dimulai hari Minggu. */
export function monthCells(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const total = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: first }, () => null);
  for (let d = 1; d <= total; d++) cells.push(toYmd(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Bagian jadwal event yang menentukan kapan event berlangsung. */
export type EventSchedule = Pick<CalEvent, "startsOn" | "endsOn" | "repeatsYearly" | "weekdays" | "exceptDates">;

/** Apakah event berlangsung pada tanggal itu? Event tanpa tanggal pasti tidak pernah dianggap berlangsung. */
export function eventOccursOn(e: EventSchedule, ymd: string): boolean {
  if (!e.startsOn) return false;
  if (e.weekdays.length > 0) {
    return ymd >= e.startsOn && (!e.endsOn || ymd <= e.endsOn) && e.weekdays.includes(weekdayOf(ymd)) && !e.exceptDates.includes(ymd);
  }
  const start = e.startsOn;
  const end = e.endsOn ?? e.startsOn;
  if (!e.repeatsYearly) return ymd >= start && ymd <= end;

  const md = ymd.slice(5);
  const s = start.slice(5);
  const f = end.slice(5);
  return s <= f ? md >= s && md <= f : md >= s || md <= f; // rentang yang melewati pergantian tahun
}

