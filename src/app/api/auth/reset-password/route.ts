import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { readBody, fail, TOO_MANY } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { consumeToken } from "@/lib/tokens";
import { resetPasswordSchema } from "@/lib/validators";

/** Mengganti password dengan token dari email. Password divalidasi dulu supaya token tidak terbuang percuma. */
export async function POST(req: Request) {
  if (!rateLimit(`reset:${clientKey(req)}`, 20, 60 * 60_000)) return fail(TOO_MANY, 429);

  const body = await readBody(req);
  if (body === null) return fail("Body tidak valid");
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Input tidak valid");

  try {
    const hit = await consumeToken(parsed.data.token, "RESET_PASSWORD");
    if (!hit) return fail("Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru.", 400, "TOKEN_INVALID");

    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.user.update({ where: { id: hit.userId }, data: { passwordHash } });
    // Bisa menerima email berarti pemilik email: akun yang belum terverifikasi ikut terverifikasi.
    await prisma.user.updateMany({ where: { id: hit.userId, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
    // Tautan reset lain yang masih beredar tidak boleh berlaku lagi.
    await prisma.authToken.deleteMany({ where: { userId: hit.userId, type: "RESET_PASSWORD" } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[auth/reset-password] failed", error);
    return fail("Terjadi kesalahan. Coba lagi.", 500);
  }
}
