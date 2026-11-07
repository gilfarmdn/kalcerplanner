import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readBody } from "@/lib/api";
import { err, TOO_MANY } from "@/lib/auth-api";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { consumeToken } from "@/lib/tokens";
import { verifyEmailSchema } from "@/lib/validators";

/** Dipanggil halaman /verifikasi (lewat POST agar pemindai tautan email tidak menghabiskan token). */
export async function POST(req: Request) {
  if (!rateLimit(`verify:${clientKey(req)}`, 30, 60 * 60_000)) return err(TOO_MANY, 429);

  const body = await readBody(req);
  if (body === null) return err("Body tidak valid");
  const parsed = verifyEmailSchema.safeParse(body);
  if (!parsed.success) return err("Tautan verifikasi tidak valid.");

  try {
    const hit = await consumeToken(parsed.data.token, "VERIFY_EMAIL");
    if (!hit) return err("Tautan verifikasi tidak valid atau sudah kedaluwarsa.", 400, "TOKEN_INVALID");

    await prisma.user.updateMany({ where: { id: hit.userId, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[auth/verify-email] failed", error);
    return err("Terjadi kesalahan. Coba lagi.", 500);
  }
}
