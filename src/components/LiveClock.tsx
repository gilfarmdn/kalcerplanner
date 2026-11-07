"use client";

import { useEffect, useState } from "react";

const fmt = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Asia/Jakarta",
});

/** "Senin, 3 November 2025 - 17:42:32" (WIB), as in the Figma dashboard header. */
export default function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <span className="inline-block h-6 w-64" aria-hidden />;
  // ICU versions differ ("... 2025 pukul 17.42.32" vs "... 2025 17.42.32"): normalise to "... 2025 - 17:42:32".
  const text = fmt
    .format(now)
    .replace(/\./g, ":")
    .replace(/(\d{4}),?\s+(?:pukul\s+)?(\d{2}:\d{2}:\d{2})/, "$1 - $2");
  return <time dateTime={now.toISOString()}>{text}</time>;
}
