import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { err, findManageableObject, firstIssueId, guardPelaku, readJson, uniqueSlug } from "@/lib/pelaku-api";
import { eventSchema } from "@/lib/pelaku-validators";
import { eventScheduleData } from "@/lib/pelaku-api";

/** Tambah event budaya pada destinasi milik sendiri. */
export async function POST(req: Request) {
  const g = await guardPelaku();
  if (!g.ok) return g.error;

  const body = await readJson(req);
  if (body === null) return err("Body tidak valid");
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return err(firstIssueId(parsed.error));
  const d = parsed.data;

  const object = await findManageableObject(g.user, d.objectId);
  if (!object) return err("Destinasi tidak ditemukan", 404);

  try {
    const created = await prisma.culturalEvent.create({
      data: {
        slug: uniqueSlug(d.title),
        title: d.title,
        description: d.description,
        interest: object.interest,
        zone: object.zone,
        objectId: object.id,
        ...eventScheduleData(d),
        venue: d.venue ?? null,
        isActive: d.isActive,
      },
      select: { id: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[pelaku/events] create failed", error);
    return err("Gagal menyimpan event", 500);
  }
}
