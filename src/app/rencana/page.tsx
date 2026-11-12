import type { Metadata } from "next";
import RencanaBuilder, { type RencanaInitial } from "@/components/RencanaBuilder";
import SiteShell from "@/components/SiteShell";
import { getUser } from "@/lib/auth";
import { INTERESTS, isInterest, type Interest } from "@/lib/culture";
import { VISIBLE_STATUSES, plannableEvent } from "@/lib/culture-db";
import { prisma } from "@/lib/prisma";

export const generateMetadata = (): Metadata => ({ title: "Rencana — KalcerPlanner" });
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const date = (v: string | string[] | undefined) => (/^\d{4}-\d{2}-\d{2}$/.test(first(v)) ? first(v) : "");
const int = (v: string | string[] | undefined, min: number, max: number, fallback: number) => {
  const n = Number.parseInt(first(v), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const interestList = (v: string | string[] | undefined): Interest[] =>
  first(v)
    .split(",")
    .filter(isInterest)
    .slice(0, INTERESTS.length);

export default async function RencanaPage({ searchParams }: { searchParams: SP }) {
  // Rencana terbuka untuk semua pengunjung; hanya menyimpan ke My Trip yang perlu masuk (lihat PlanResults).
  const user = await getUser();

  // Pilihan wilayah tujuan diambil dari database (nilai `zone` objek yang tampil), jadi selalu cocok dengan data.
  const [zoneRows, eventZoneRows] = await Promise.all([
    prisma.culturalObject.findMany({
      where: { status: { in: [...VISIBLE_STATUSES] } },
      distinct: ["zone"],
      select: { zone: true },
    }),
    // Event mandiri juga bisa masuk rencana, jadi wilayahnya ikut jadi pilihan.
    prisma.culturalEvent.findMany({ where: plannableEvent, distinct: ["zone"], select: { zone: true } }),
  ]);
  const zones = [...new Set([...zoneRows.map((r) => r.zone), ...eventZoneRows.flatMap((r) => (r.zone ? [r.zone] : []))])].sort((a, b) =>
    a.localeCompare(b, "id"),
  );

  // Values can come from the homepage "RENCANA" box (via ?query) — sanitise before use.
  const initial: RencanaInitial = {
    startDate: date(searchParams.pergi),
    endDate: date(searchParams.pulang),
    adults: int(searchParams.dewasa, 1, 20, 1),
    children: int(searchParams.anak, 0, 20, 0),
    budget: first(searchParams.anggaran).replace(/\D/g, "").slice(0, 10),
    interests: interestList(searchParams.minat),
    zone: zones.includes(first(searchParams.wilayah)) ? first(searchParams.wilayah) : zones.length === 1 ? zones[0] : "",
  };

  return (
    <SiteShell>
      <RencanaBuilder initial={initial} isLoggedIn={!!user} zones={zones} />
    </SiteShell>
  );
}
