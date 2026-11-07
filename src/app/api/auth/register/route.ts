import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { readBody } from "@/lib/api";
import { err, TOO_MANY } from "@/lib/auth-api";
import { sendVerificationEmail } from "@/lib/auth-mail";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { issueToken } from "@/lib/tokens";
import { registerSchema } from "@/lib/validators";

/** Mendaftar: akun dibuat BELUM terverifikasi dan belum masuk; tautan verifikasi dikirim lewat email. */
export async function POST(req: Request) {
  if (!rateLimit(`register:${clientKey(req)}`, 10, 60 * 60_000)) return err(TOO_MANY, 429);

  const body = await readBody(req);
  if (body === null) return err("Body tidak valid");
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Input tidak valid");

  try {
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
    if (existing) return err("Email sudah terdaftar. Silakan masuk.", 409);

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const user = await prisma.user.create({
      data: { name: parsed.data.name, email: parsed.data.email, passwordHash, role: parsed.data.role },
      select: { id: true, name: true, email: true },
    });

    let emailSent = true;
    try {
      const token = await issueToken(user.id, "VERIFY_EMAIL");
      await sendVerificationEmail(req, user, token, parsed.data.next);
    } catch (mailError) {
      // Akun sudah dibuat; pengguna bisa meminta kirim ulang dari halaman masuk.
      emailSent = false;
      console.error("[auth/register] gagal mengirim email verifikasi", mailError);
    }

    return NextResponse.json({ ok: true, needsVerification: true, emailSent }, { status: 201 });
  } catch (error) {
    console.error("[auth/register] failed", error);
    return err("Terjadi kesalahan. Coba lagi.", 500);
  }
}
