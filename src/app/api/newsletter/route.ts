import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newsletterSchema } from "@/lib/validators";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Email tidak valid" }, { status: 400 });
  }

  try {
    await prisma.newsletterSubscriber.upsert({
      where: { email: parsed.data.email },
      update: {},
      create: { email: parsed.data.email },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[newsletter] upsert failed", error);
    return NextResponse.json({ error: "Gagal berlangganan" }, { status: 500 });
  }
}
