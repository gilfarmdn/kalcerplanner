import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readBody, fail, TOO_MANY } from "@/lib/api";
import { sendVerificationEmail } from "@/lib/auth-mail";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { issueToken } from "@/lib/tokens";
import { emailOnlySchema } from "@/lib/validators";

/** Kirim ulang email verifikasi. Selalu menjawab sukses agar tidak membocorkan email mana yang terdaftar. */
export async function POST(req: Request) {
  if (!rateLimit(`resend-ip:${clientKey(req)}`, 10, 60 * 60_000)) return fail(TOO_MANY, 429);

  const body = await readBody(req);
  if (body === null) return fail("Body tidak valid");
  const parsed = emailOnlySchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Input tidak valid");

  if (!rateLimit(`resend-email:${parsed.data.email}`, 3, 60 * 60_000)) return fail(TOO_MANY, 429);

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, name: true, email: true, emailVerifiedAt: true },
    });
    if (user && !user.emailVerifiedAt) {
      const token = await issueToken(user.id, "VERIFY_EMAIL");
      await sendVerificationEmail(req, user, token, parsed.data.next);
    }
  } catch (error) {
    // Kegagalan kirim tidak diberitahukan ke klien (agar jawabannya tetap seragam); cukup dicatat di server.
    console.error("[auth/resend-verification] failed", error);
  }
  return NextResponse.json({ ok: true });
}
