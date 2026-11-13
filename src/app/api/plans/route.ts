import { NextResponse } from "next/server";
import { fail, firstIssue, readBody } from "@/lib/api";
import { getPlannerEvents, getPlannerObjects } from "@/lib/culture-db";
import { pickSouvenirs } from "@/lib/content";
import { buildPlans, planZones } from "@/lib/planner";
import { getUmkmProducts } from "@/lib/umkm";
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
    const plans = buildPlans(objects, events, parsed.data);
    // Saran oleh-oleh: produk UMKM dari wilayah yang sama dengan tempat-tempat di tiap rencana.
    const products = parsed.data.includeSouvenir ? await getUmkmProducts() : [];
    return NextResponse.json({
      plans: plans.map((plan) => ({ ...plan, souvenirs: pickSouvenirs(plan.souvenirAllowance, planZones(plan), products) })),
    });
  } catch (error) {
    console.error("[plans] failed", error);
    return fail("Gagal menyusun rencana", 500);
  }
}
