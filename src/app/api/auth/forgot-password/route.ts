import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readBody } from "@/lib/api";
import { err, TOO_MANY } from "@/lib/auth-api";
import { sendResetEmail } from "@/lib/auth-mail";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { issueToken } from "@/lib/tokens";
import { emailOnlySchema } from "@/lib/validators";

/** Meminta tautan reset password. Tautan hanya dikirim ke email yang terdaftar; email lain ditolak dengan pesan jelas. */
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
    if (!user) return err("Email tidak terdaftar. Periksa kembali atau daftar akun baru.", 404, "EMAIL_NOT_FOUND");
    const token = await issueToken(user.id, "RESET_PASSWORD");
    await sendResetEmail(req, user, token);
    return NextResponse.json({ ok: true, email: user.email });
  } catch (error) {
    console.error("[auth/forgot-password] failed", error);
    return err("Gagal mengirim tautan reset. Coba lagi nanti.", 500);
  }
}
