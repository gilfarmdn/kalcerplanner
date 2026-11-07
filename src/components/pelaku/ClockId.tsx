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

/** Jam hidup WIB, mis. "Senin, 3 November 2025 - 17.42.32". Dirender setelah mount agar tidak beda dengan server. */
export default function ClockId() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span suppressHydrationWarning>{now ? fmt.format(now).replace(/\./g, ":").replace(" pukul ", " - ") : " "}</span>;
}
