import { NextResponse } from "next/server";
import { fail, firstIssue, readBody } from "@/lib/api";
import { getPlannerEvents, getPlannerObjects } from "@/lib/culture-db";
import { buildPlans } from "@/lib/planner";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { planInputSchema } from "@/lib/validators";

/**
 * Menghitung tiga varian rencana dari isian formulir. Terbuka tanpa login (pengunjung boleh mencoba);
 * tidak ada yang disimpan. Menyimpan rencana ada di /api/trips dan itu wajib login.
 */
export async function POST(req: Request) {
  if (!rateLimit(`plans:${clientKey(req)}`, 30, 10 * 60_000)) {
    return fail("Terlalu banyak permintaan. Coba lagi beberapa menit lagi.", 429);
  }

  const body = await readBody(req);
  if (body === null) return fail("Body tidak valid");
  const parsed = planInputSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  try {
    const [objects, events] = await Promise.all([getPlannerObjects(), getPlannerEvents()]);
    if (objects.length === 0) return fail("Data budaya belum tersedia. Jalankan seed database.", 503);
    return NextResponse.json({ plans: buildPlans(objects, events, parsed.data) });
  } catch (error) {
    console.error("[plans] failed", error);
    return fail("Gagal menyusun rencana", 500);
  }
}
