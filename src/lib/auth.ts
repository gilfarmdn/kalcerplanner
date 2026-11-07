import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Interest } from "@/lib/culture";
import { COOKIE_NAME, sessionCookieOptions, signSession, verifySession } from "@/lib/session-token";

export type SessionUser = { id: string; name: string; email: string };

/** Membuat sesi baru (cookie sesi: berakhir saat peramban ditutup atau 45 menit tanpa aktivitas). */
export async function createSession(user: SessionUser) {
  cookies().set(COOKIE_NAME, await signSession(user), sessionCookieOptions);
}

export function destroySession() {
  cookies().set(COOKIE_NAME, "", { ...sessionCookieOptions, maxAge: 0 });
}

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "TRAVELER" | "PRACTITIONER" | "ADMIN";
  interests: Interest[];
  avatarUrl: string | null;
};

/** Session user re-read from the database (fresh role/preferences). Null if signed out or the account is gone. */
export async function getUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, role: true, interests: true, avatarUrl: true, deactivatedAt: true },
  });
  // Akun yang dinonaktifkan kurator diperlakukan seperti sudah keluar.
  if (!user || user.deactivatedAt) return null;
  const { deactivatedAt: _, ...rest } = user;
  return rest;
}

/** For server pages that need a signed-in user: redirects visitors to the login page and back. */
export async function requireUser(next: string): Promise<CurrentUser> {
  const user = await getUser();
  if (!user) redirect(`/masuk?next=${encodeURIComponent(next)}`);
  return user;
}

/** Halaman khusus pelaku budaya: kurator diarahkan ke halaman kurasi. */
export async function requirePractitioner(next: string): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (user.role === "ADMIN") redirect("/pelaku/kurasi");
  return user;
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const claims = await verifySession(token);
  return claims ? { id: claims.id, name: claims.name, email: claims.email } : null;
}
