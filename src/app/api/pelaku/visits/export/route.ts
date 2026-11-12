import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/api";
import { guardPelaku } from "@/lib/pelaku-api";
import { dayString } from "@/lib/tanggal";
import { visitStatusLabel } from "@/lib/pelaku-validators";
import { visitWhere } from "@/lib/pelaku-visits";

// Sel yang diawali = + - @ diberi awalan ' agar tidak dieksekusi sebagai rumus di Excel (CSV injection).
const cell = (v: string | number | null | undefined) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

/** Ekspor CSV kunjungan sesuai filter yang sama dengan halaman Riwayat Kunjungan. */
export async function GET(req: Request) {
  const g = await guardPelaku();
  if (!g.ok) return g.error;

  const sp = new URL(req.url).searchParams;
  const where = visitWhere(g.user, {
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    objectId: sp.get("objectId") ?? undefined,
    eventId: sp.get("eventId") ?? undefined,
    status: sp.get("status") ?? undefined,
    q: sp.get("q") ?? undefined,
  });

  try {
    const rows = await prisma.visit.findMany({
      where,
      orderBy: [{ visitDate: "desc" }, { createdAt: "desc" }],
      take: 5000,
      include: { object: { select: { name: true } }, event: { select: { title: true } } },
    });
    const header = ["Tanggal", "Destinasi", "Event", "Nama", "Kontak", "Jumlah orang", "Status", "Sumber", "Catatan"];
    const lines = rows.map((r) =>
      [
        dayString(r.visitDate),
        r.object?.name ?? r.event?.title,
        r.object ? r.event?.title : "Event mandiri",
        r.visitorName,
        r.contact,
        r.partySize,
        visitStatusLabel[r.status],
        r.source === "WALKIN" ? "Walk-in" : "Daring",
        r.note,
      ]
        .map(cell)
        .join(","),
    );
    const csv = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="riwayat-kunjungan.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[pelaku/visits] export failed", error);
    return fail("Gagal membuat ekspor", 500);
  }
}
