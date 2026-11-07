import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, firstIssue, guard, readBody } from "@/lib/api";
import { SOURCE_NOTE_SUBMITTED } from "@/lib/culture";
import { resolveImageUrl } from "@/lib/images";
import { objectProposalSchema } from "@/lib/validators";
import { eventScheduleData } from "@/lib/pelaku-api";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "objek";

/** Practitioners propose cultural objects; they stay PENDING (hidden from recommendations) until verified. */
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

  if (d.isEvent) {
    if (d.eventRecurrence === "WEEKLY" && d.eventWeekdays.length === 0) return fail("Pilih minimal satu hari berlangsung");
    if (!d.eventStartsOn) return fail("Isi tanggal mulai event");
    if (d.eventEndsOn && d.eventEndsOn < d.eventStartsOn) return fail("Tanggal selesai tidak boleh sebelum tanggal mulai");
  }

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
        isEvent: d.isEvent,
        ...(d.isEvent && d.eventStartsOn
          ? {
            events: {
              create: {
                slug: `${slugify(d.name)}-${randomBytes(2).toString("hex")}`,
                title: d.name,
                description: d.summary,
                interest: d.interest,
                zone: d.zone,
                ...eventScheduleData({
                  startsOn: d.eventStartsOn,
                  endsOn: d.eventEndsOn,
                  recurrence: d.eventRecurrence,
                  weekdays: d.eventWeekdays,
                  exceptDates: d.eventExceptDates,
                }),
              },
            },
          }
        : {}),
      },
      select: { id: true, slug: true, status: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[objects] create failed", error);
    return fail("Gagal menyimpan data", 500);
  }
}
