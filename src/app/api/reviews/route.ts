import { NextResponse } from "next/server";
import { fail, firstIssue, guard, readBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { reviewSchema } from "@/lib/validators";

/** Ulasan dari halaman Bantuan. Disimpan untuk dimoderasi (isPublished = false). */
export async function POST(req: Request) {
  const g = await guard();
  if (!g.ok) return g.error;
  if (!rateLimit(`review:${g.user.id}`, 5, 60 * 60_000)) return fail("Terlalu banyak ulasan. Coba lagi nanti.", 429);

  const body = await readBody(req);
  if (body === null) return fail("Body tidak valid");
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  try {
    await prisma.review.create({
      data: { authorName: g.user.name, rating: parsed.data.rating, content: parsed.data.content, isPublished: false },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[reviews] create failed", error);
    return fail("Gagal mengirim ulasan", 500);
  }
}
