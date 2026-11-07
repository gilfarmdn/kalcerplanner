import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, firstIssue, guard, readBody } from "@/lib/api";
import { todayJakarta } from "@/lib/format";
import { stampSchema } from "@/lib/validators";

/**
 * Paspor Budaya: a stamp can only be claimed for a place that is in one of the user's own trips,
 * from the trip's departure day onwards. This is a light anti-abuse rule, not proof of presence.
 */
export async function POST(req: Request) {
  const g = await guard();
  if (!g.ok) return g.error;

  const body = await readBody(req);
  if (body === null) return fail("Body tidak valid");
  const parsed = stampSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { objectId, note } = parsed.data;

  try {
    const today = new Date(`${todayJakarta()}T00:00:00.000Z`);
    const item = await prisma.tripItem.findFirst({
      where: { objectId, trip: { userId: g.user.id, startDate: { lte: today } } },
      select: { tripId: true },
      orderBy: { trip: { startDate: "desc" } },
    });
    if (!item) {
      return fail("Stempel hanya bisa diklaim untuk tempat dalam rencanamu, mulai hari keberangkatan.", 403);
    }

    const stamp = await prisma.stamp.upsert({
      where: { userId_objectId: { userId: g.user.id, objectId } },
      update: { note: note ?? null },
      create: { userId: g.user.id, objectId, tripId: item.tripId, note: note ?? null },
      select: { id: true },
    });
    return NextResponse.json({ id: stamp.id }, { status: 201 });
  } catch (error) {
    console.error("[stamps] failed", error);
    return fail("Gagal menyimpan stempel", 500);
  }
}
