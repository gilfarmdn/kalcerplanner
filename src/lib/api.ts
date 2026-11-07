import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getUser, type CurrentUser } from "@/lib/auth";

export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function readBody(req: Request): Promise<unknown | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export const firstIssue = (e: ZodError) => e.issues[0]?.message ?? "Input tidak valid";

type Guard = { ok: true; user: CurrentUser } | { ok: false; error: NextResponse };

/** Resolves the signed-in user, optionally restricted to roles. Returns a ready 401/403 response otherwise. */
export async function guard(roles?: CurrentUser["role"][]): Promise<Guard> {
  const user = await getUser();
  if (!user) return { ok: false, error: fail("Silakan masuk terlebih dahulu", 401) };
  if (roles && !roles.includes(user.role)) return { ok: false, error: fail("Akses tidak diizinkan", 403) };
  return { ok: true, user };
}
