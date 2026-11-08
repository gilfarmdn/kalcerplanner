import { NextResponse } from "next/server";
import { fail, firstIssue, readBody, TOO_MANY } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { newsletterSchema } from "@/lib/validators";

/** Berlangganan newsletter (form di footer, tanpa login). Dibatasi per IP agar tabel tidak dibanjiri. */
export async function POST(req: Request) {
  if (!rateLimit(`newsletter:${clientKey(req)}`, 5, 60 * 60_000)) return fail(TOO_MANY, 429);

  const body = await readBody(req);
  if (body === null) return fail("Body tidak valid");
  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  try {
    await prisma.newsletterSubscriber.upsert({
      where: { email: parsed.data.email },
      update: {},
      create: { email: parsed.data.email },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[newsletter] upsert failed", error);
    return fail("Gagal berlangganan", 500);
  }
}
