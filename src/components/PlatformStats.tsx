import Link from "next/link";
import { VISIBLE_STATUSES, visibleEvent } from "@/lib/culture-db";
import { prisma } from "@/lib/prisma";

/** Real counts from the database (no invented numbers). Hidden if the database is unreachable. */
export default async function PlatformStats() {
  let stats: { users: number; objects: number; events: number; partners: number } | null = null;
  try {
    const visible = { status: { in: [...VISIBLE_STATUSES] }, isEvent: false };
    const [users, objects, events, partners] = await Promise.all([
      prisma.user.count({ where: { role: "TRAVELER" } }), // Pengguna Platform
      prisma.culturalObject.count({ where: visible }), // Destinasi Budaya
      prisma.culturalEvent.count({ where: { isActive: true, ...visibleEvent } }), // Agenda Budaya
      prisma.culturalObject.count({ where: { ...visible, localRun: true } }), // Mitra Lokal
    ]);
    stats = { users, objects, events, partners };
  } catch (error) {
    console.error("[PlatformStats] database unavailable", error);
  }
  if (!stats || stats.objects === 0) return null;

  const cells = [
    { label: "Pengguna Platform", value: stats.users },
    { label: "Destinasi Budaya", value: stats.objects },
    { label: "Agenda Budaya", value: stats.events },
    { label: "Mitra Lokal", value: stats.partners },
  ];

  return (
    <section id="statistik" className="mx-auto max-w-[1080px] px-4 pb-16 pt-14 sm:px-8">
      <dl className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cells.map((c) => (
          <div key={c.label} className="rounded-[10px] bg-white p-5 text-center shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
            <dd className="font-serif text-4xl font-bold">{c.value}</dd>
            <dt className="mt-1 text-sm text-neutral-700">{c.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
