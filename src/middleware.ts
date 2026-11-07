import { NextResponse, type NextRequest } from "next/server";
import { ABSOLUTE_SECONDS, COOKIE_NAME, RENEW_AFTER_SECONDS, sessionCookieOptions, signSession, verifySession } from "@/lib/session-token";

/**
 * Menjaga sesi: selama pengguna aktif, token diperbarui (batas diam 45 menit digeser maju).
 * Tanpa aktivitas 45 menit token kedaluwarsa; lewat 12 jam sejak masuk token tidak diperbarui lagi.
 */
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.next();

  // Rute masuk/keluar mengatur cookie-nya sendiri.
  if (req.nextUrl.pathname.startsWith("/api/auth/")) return NextResponse.next();

  const claims = await verifySession(token);
  if (!claims) {
    // Token kedaluwarsa atau tidak sah: bersihkan cookie-nya.
    const res = NextResponse.next();
    res.cookies.set(COOKIE_NAME, "", { ...sessionCookieOptions, maxAge: 0 });
    return res;
  }

  // Prefetch otomatis dari Next.js bukan aktivitas pengguna.
  const isPrefetch = req.headers.get("next-router-prefetch") || req.headers.get("purpose") === "prefetch";
  const now = Math.floor(Date.now() / 1000);
  const withinAbsolute = now - claims.loginAt < ABSOLUTE_SECONDS;
  const dueForRenewal = now - claims.iat >= RENEW_AFTER_SECONDS;

  const res = NextResponse.next();
  if (!isPrefetch && withinAbsolute && dueForRenewal) {
    res.cookies.set(COOKIE_NAME, await signSession({ id: claims.id, name: claims.name, email: claims.email }, claims.loginAt), sessionCookieOptions);
  }
  return res;
}

export const config = {
  // Semua halaman dan API, kecuali berkas statis dan gambar.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|api/placeholder|api/images).*)"],
};