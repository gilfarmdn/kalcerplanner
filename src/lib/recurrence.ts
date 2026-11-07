export const RECURRENCES = ["ONCE", "YEARLY", "WEEKLY"] as const;
export type Recurrence = (typeof RECURRENCES)[number];

export const recurrenceLabel: Record<Recurrence, string> = {
  ONCE: "Sekali (tanggal pasti)",
  YEARLY: "Berulang setiap tahun",
  WEEKLY: "Rutin mingguan (hari tertentu)",
};

export const WEEKDAY_OPTIONS = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
  { value: 0, label: "Minggu" },
] as const;

export const weekdaysText = (days: number[]) =>
  WEEKDAY_OPTIONS.filter((d) => days.includes(d.value)).map((d) => d.label).join(", ");