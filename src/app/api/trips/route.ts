import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, firstIssue, guard, readBody } from "@/lib/api";
import { getPlannerEvents, getPlannerObjects } from "@/lib/culture-db";
import { formatRange } from "@/lib/format";
import { buildSinglePlan } from "@/lib/planner";
import { saveTripSchema } from "@/lib/validators";

/**
 * Saves a plan. The server rebuilds the chosen variant from the input instead of trusting prices
 * or items sent by the browser (the engine is deterministic, so it equals what the user saw).
 */
export async function POST(req: Request) {
  const g = await guard();
  if (!g.ok) return g.error;

  const body = await readBody(req);
  if (body === null) return fail("Body tidak valid");
  const parsed = saveTripSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { style, input } = parsed.data;

  try {
    const [objects, events] = await Promise.all([getPlannerObjects(), getPlannerEvents()]);
    const plan = buildSinglePlan(style, objects, events, input);
    if (plan.itemCount === 0) return fail("Rencana kosong. Ubah minat atau anggaranmu lalu coba lagi.");

    // Judul memakai wilayah tempat-tempat di rencana (platform tidak lagi terbatas di Yogyakarta).
    const zones = [...new Set(plan.days.flatMap((d) => d.items.map((it) => it.object.zone)))];
    const destination = zones.length <= 2 ? zones.join(" & ") : `${zones[0]} dan sekitarnya`;
    const start = new Date(`${input.startDate}T00:00:00.000Z`);
    const end = new Date(`${input.endDate}T00:00:00.000Z`);
    let order = 0;

    const trip = await prisma.trip.create({
      data: {
        userId: g.user.id,
        title: `Wisata Budaya ${destination} · ${formatRange(start, end)}`,
        style,
        startDate: start,
        endDate: end,
        adults: input.adults,
        children: input.children,
        budget: input.budget ?? null,
        originCostIdr: input.originCost,
        lodging: input.lodging,
        rooms: input.rooms,
        includeSouvenir: input.includeSouvenir,
        localTransport: input.transport !== "NONE",
        interests: input.interests,
        depth: input.depth,
        spreadTourism: input.spreadTourism,
        costTickets: plan.costs.tickets,
        costMeals: plan.costs.meals,
        costLocal: plan.costs.local,
        costLodging: plan.costs.lodging,
        totalIdr: plan.total,
        impactIdr: plan.impactIdr,
        notes: plan.notes,
        items: {
          create: plan.days.flatMap((day) =>
            day.items.map((it) => ({
              objectId: it.object.id,
              dayIndex: day.dayIndex,
              slot: it.slot,
              sortOrder: order++,
              priceIdr: it.priceIdr,
              reasons: it.reasons,
            })),
          ),
        },
      },
      select: { id: true },
    });
    return NextResponse.json({ id: trip.id }, { status: 201 });
  } catch (error) {
    console.error("[trips] create failed", error);
    return fail("Gagal menyimpan rencana", 500);
  }
}
