import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const BOUNCE_EVENTS = new Set(["hard_bounce", "hardBounce", "blocked", "invalid_email", "invalid"]);

function authorized(req: Request): boolean {
  const secret = process.env.BREVO_WEBHOOK_SECRET;
  if (!secret) return false;
  const got = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, ""));
  const want = Buffer.from(secret);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { event?: string; email?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || !body?.event || !BOUNCE_EVENTS.has(body.event)) return NextResponse.json({ ok: true });

  await prisma.emailBounce.upsert({
    where: { email },
    update: { reason: body.event },
    create: { email, reason: body.event },
  });
  // Hanya akun yang belum pernah terverifikasi yang dihapus otomatis; akun terverifikasi tidak disentuh.
  await prisma.user.deleteMany({ where: { email, emailVerifiedAt: null } });
  return NextResponse.json({ ok: true });
}
