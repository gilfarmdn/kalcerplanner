const dayFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const toDate = (d: Date | string) => (typeof d === "string" ? new Date(`${d.slice(0, 10)}T00:00:00.000Z`) : d);

export const formatDay = (d: Date | string) => dayFmt.format(toDate(d));

export function formatRange(start: Date | string, end: Date | string) {
  const s = toDate(start);
  const e = toDate(end);
  return s.getTime() === e.getTime() ? formatDay(s) : `${formatDay(s)} – ${formatDay(e)}`;
}

/** Today as YYYY-MM-DD in Jakarta time (the platform's time zone). */
export function todayJakarta(): string {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
}
