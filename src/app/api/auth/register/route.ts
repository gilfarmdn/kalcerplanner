import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { readBody, fail, TOO_MANY } from "@/lib/api";
import { sendVerificationEmail } from "@/lib/auth-mail";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { issueToken } from "@/lib/tokens";
import { TURNSTILE_FAILED, verifyTurnstile } from "@/lib/turnstile";
import { registerSchema } from "@/lib/validators";
import { canSendTo } from "@/lib/email-check";

/** Mendaftar: akun dibuat BELUM terverifikasi dan belum masuk; tautan verifikasi dikirim lewat email. */
export async function POST(req: Request) {
  if (!rateLimit(`register:${clientKey(req)}`, 10, 60 * 60_000)) return fail(TOO_MANY, 429);

  const body = await readBody(req);
  if (body === null) return fail("Body tidak valid");
  if (!(await verifyTurnstile((body as { turnstileToken?: unknown }).turnstileToken, clientKey(req)))) {
    return fail(TURNSTILE_FAILED, 400, "TURNSTILE_FAILED");
  }
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Input tidak valid");

  try {
    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, emailVerifiedAt: true },
    });
    if (existing?.emailVerifiedAt) return fail("Email sudah terdaftar. Silakan masuk.", 409);
    
    if (!(await canSendTo(parsed.data.email))) {
      return fail("Alamat email ini tidak dapat menerima email. Gunakan alamat lain.", 400);
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const data = { name: parsed.data.name, passwordHash, role: parsed.data.role };
    // Akun yang belum pernah diverifikasi belum terbukti milik siapa pun (bisa salah ketik atau alamat palsu),
    // jadi pendaftaran ulang menimpanya dan mengirim tautan verifikasi baru, bukan mengunci alamat itu.
    const user = existing
      ? await prisma.user.update({ where: { id: existing.id }, data, select: { id: true, name: true, email: true } })
      : await prisma.user.create({ data: { ...data, email: parsed.data.email }, select: { id: true, name: true, email: true } });

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
    return fail("Terjadi kesalahan. Coba lagi.", 500);
  }
}
