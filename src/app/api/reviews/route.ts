import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { reviewSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid" }, { status: 400 });
  }

  try {
    await prisma.review.create({
      data: {
        authorName: session.name,
        authorRole: "Wisatawan",
        rating: parsed.data.rating,
        content: parsed.data.content,
        // Held for moderation; set isPublished = true (e.g. via Prisma Studio) to show it on the homepage.
        isPublished: false,
      },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[reviews] create failed", error);
    return NextResponse.json({ error: "Gagal mengirim ulasan" }, { status: 500 });
  }
}
