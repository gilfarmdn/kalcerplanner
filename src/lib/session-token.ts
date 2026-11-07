// Token sesi (JWT) dan aturan masa berlakunya. Murni jose, tanpa next/headers, sehingga dipakai juga oleh middleware (edge).
//
// Aturan sesi:
//  - Cookie tanpa tanggal kedaluwarsa  -> hilang saat peramban ditutup.
//  - Token berlaku IDLE_SECONDS (45 menit) sejak aktivitas terakhir; middleware memperbaruinya selama pengguna aktif.
//  - Batas mutlak ABSOLUTE_SECONDS sejak masuk; setelahnya token tidak diperbarui lagi dan pengguna harus masuk ulang.

import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "kp_session";
export const IDLE_SECONDS = 45 * 60;
export const ABSOLUTE_SECONDS = 12 * 60 * 60;
/** Token baru diterbitkan paling sering sekali per RENEW_AFTER_SECONDS agar tidak menulis cookie di tiap permintaan. */
export const RENEW_AFTER_SECONDS = 60;

export type SessionClaims = { id: string; name: string; email: string; iat: number; loginAt: number };

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set (min. 16 characters) in production");
    }
    return new TextEncoder().encode("dev-only-insecure-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

const nowSec = () => Math.floor(Date.now() / 1000);

/** Opsi cookie sesi: sengaja TANPA maxAge/expires, jadi cookie berakhir saat peramban ditutup. */
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  // Set COOKIE_SECURE=true when serving over HTTPS.
  secure: process.env.COOKIE_SECURE === "true",
  path: "/",
};

export async function signSession(user: { id: string; name: string; email: string }, loginAt = nowSec()): Promise<string> {
  const now = nowSec();
  return new SignJWT({ name: user.name, email: user.email, loginAt })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt(now)
    .setExpirationTime(now + IDLE_SECONDS)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.name !== "string" || typeof payload.email !== "string" || typeof payload.iat !== "number") return null;
    const loginAt = typeof payload.loginAt === "number" ? payload.loginAt : payload.iat;
    return { id: payload.sub, name: payload.name, email: payload.email, iat: payload.iat, loginAt };
  } catch {
    return null;
  }
}