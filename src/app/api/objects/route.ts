import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, firstIssue, guard, readBody } from "@/lib/api";
import { SOURCE_NOTE_SUBMITTED } from "@/lib/culture";
import { resolveImageUrl } from "@/lib/images";
import { objectProposalSchema } from "@/lib/validators";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "objek";

/**
 * Practitioners propose cultural objects; they stay PENDING (hidden from recommendations) until verified.
 * Event budaya tidak lewat sini: lihat POST /api/events (tabel CulturalEvent).
 */
export async function POST(req: Request) {
  const g = await guard(["PRACTITIONER"]);
  if (!g.ok) return g.error;

  const body = await readBody(req);
  if (body === null) return fail("Body tidak valid");
  const parsed = objectProposalSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;

  const imageUrl = await resolveImageUrl(g.user, d.imageUrl);
  if (imageUrl === false) return fail("Foto tidak valid, silakan unggah ulang");

  try {
    const created = await prisma.culturalObject.create({
      data: {
        slug: `${slugify(d.name)}-${randomBytes(2).toString("hex")}`,
        name: d.name,
        kind: d.kind,
        interest: d.interest,
        zone: d.zone,
        address: d.address || null,
        lat: d.lat,
        lng: d.lng,
        summary: d.summary,
        meaning: d.meaning,
        etiquette: d.etiquette,
        priceIdr: d.priceIdr,
        childPriceIdr: d.childPriceIdr ?? null,
        durationMin: d.durationMin,
        depth: d.depth,
        slots: d.slots,
        weekdays: d.weekdays,
        openTime: d.openTime,
        closeTime: d.closeTime,
        scheduleNote: d.scheduleNote || null,
        dailyQuota: d.dailyQuota ?? null,
        imageUrl: imageUrl ?? null,
        source: SOURCE_NOTE_SUBMITTED,
        status: "PENDING",
        verifiedAt: null,
        ownerId: g.user.id,
      },
      select: { id: true, slug: true, status: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[objects] create failed", error);
    return fail("Gagal menyimpan data", 500);
  }
}
