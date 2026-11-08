import { NextResponse } from "next/server";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { readBody, fail, TOO_MANY } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { roleHome } from "@/lib/role-home";
import { safeNext } from "@/lib/safe-next";
import { loginSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const ip = clientKey(req);
  if (!rateLimit(`login-ip:${ip}`, 30, 15 * 60_000)) return fail(TOO_MANY, 429);

  const body = await readBody(req);
  if (body === null) return fail("Body tidak valid");
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Input tidak valid");

  // Batas per email mencegah tebak-tebak password pada satu akun dari banyak alamat IP.
  if (!rateLimit(`login-email:${parsed.data.email}`, 10, 15 * 60_000)) return fail(TOO_MANY, 429);

  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    // Pesan sama untuk email tak dikenal dan password salah (mencegah orang menebak email yang terdaftar).
    // bcrypt tetap dijalankan untuk email tak dikenal agar lama respons tidak membocorkannya.
    const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? null);
    if (!user || !valid) return fail("Email atau password salah", 401);

    if (user.deactivatedAt) return fail("Akun ini dinonaktifkan oleh kurator. Hubungi kurator KalcerPlanner.", 403);

    // Status verifikasi hanya diungkap setelah password benar.
    if (!user.emailVerifiedAt) {
      return fail("Email belum diverifikasi. Cek kotak masuk kamu, atau kirim ulang email verifikasi.", 403, "EMAIL_NOT_VERIFIED");
    }

    if (needsRehash(user.passwordHash)) {
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
    }

    await createSession({ id: user.id, name: user.name, email: user.email });

    // Setiap login berakhir di halaman utama akunnya, apa pun tujuan yang terbawa dari kunjungan sebelumnya.
    // Satu-satunya pengecualian: wisatawan yang masuk dari tombol "Simpan Rencana" agar rencananya tidak hilang.
    const next = safeNext((body as { next?: unknown }).next as string | undefined, "");
    const redirectTo = user.role === "TRAVELER" && next.startsWith("/rencana/simpan?") ? next : roleHome(user.role);
    return NextResponse.json({ ok: true, role: user.role, redirect: redirectTo });
  } catch (error) {
    console.error("[auth/login] failed", error);
    return fail("Terjadi kesalahan. Coba lagi.", 500);
  }
}
