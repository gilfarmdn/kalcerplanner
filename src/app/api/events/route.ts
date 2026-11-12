import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, firstIssue, guard, readBody } from "@/lib/api";
import { SOURCE_NOTE_SUBMITTED } from "@/lib/culture";
import { resolveImageUrl } from "@/lib/images";
import { eventScheduleData, uniqueSlug } from "@/lib/pelaku-api";
import { eventProposalSchema } from "@/lib/validators";

/**
 * Pelaku mengajukan event budaya. Disimpan di tabel CulturalEvent (bukan CulturalObject) dan tetap PENDING,
 * tersembunyi dari Kalender, Jelajah, dan rencana sampai kurator memverifikasinya.
 */
export async function POST(req: Request) {
  const g = await guard(["PRACTITIONER"]);
  if (!g.ok) return g.error;

  const body = await readBody(req);
  if (body === null) return fail("Body tidak valid");
  const parsed = eventProposalSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;

  const imageUrl = await resolveImageUrl(g.user, d.imageUrl);
  if (imageUrl === false) return fail("Foto tidak valid, silakan unggah ulang");

  try {
    const created = await prisma.culturalEvent.create({
      data: {
        slug: uniqueSlug(d.title),
        title: d.title,
        description: d.summary,
        interest: d.interest,
        zone: d.zone,
        address: d.address || null,
        lat: d.lat,
        lng: d.lng,
        meaning: d.meaning,
        etiquette: d.etiquette,
        priceIdr: d.priceIdr,
        childPriceIdr: d.childPriceIdr ?? null,
        openTime: d.openTime,
        closeTime: d.closeTime,
        scheduleNote: d.scheduleNote || null,
        dailyQuota: d.dailyQuota ?? null,
        imageUrl: imageUrl ?? null,
        ...eventScheduleData(d),
        source: SOURCE_NOTE_SUBMITTED,
        status: "PENDING",
        verifiedAt: null,
        ownerId: g.user.id,
      },
      select: { id: true, slug: true, status: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[events] create failed", error);
    return fail("Gagal menyimpan event", 500);
  }
}
