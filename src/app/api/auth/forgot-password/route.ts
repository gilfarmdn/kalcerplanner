import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readBody } from "@/lib/api";
import { err, TOO_MANY } from "@/lib/auth-api";
import { sendResetEmail } from "@/lib/auth-mail";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { issueToken } from "@/lib/tokens";
import { emailOnlySchema } from "@/lib/validators";

/** Meminta tautan reset password. Jawaban selalu sama, ada atau tidaknya email itu di database. */
export async function POST(req: Request) {
  if (!rateLimit(`forgot-ip:${clientKey(req)}`, 10, 60 * 60_000)) return err(TOO_MANY, 429);

  const body = await readBody(req);
  if (body === null) return err("Body tidak valid");
  const parsed = emailOnlySchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Input tidak valid");

  if (!rateLimit(`forgot-email:${parsed.data.email}`, 3, 60 * 60_000)) return err(TOO_MANY, 429);

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, name: true, email: true },
    });
    if (user) {
      const token = await issueToken(user.id, "RESET_PASSWORD");
      await sendResetEmail(req, user, token);
    }
  } catch (error) {
    console.error("[auth/forgot-password] failed", error);
  }
  return NextResponse.json({ ok: true });
}
