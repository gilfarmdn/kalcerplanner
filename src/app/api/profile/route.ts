import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { fail, firstIssue, guard, readBody } from "@/lib/api";
import { profileSchema } from "@/lib/validators";

export async function PATCH(req: Request) {
  const g = await guard();
  if (!g.ok) return g.error;

  const body = await readBody(req);
  if (body === null) return fail("Body tidak valid");
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  try {
    const user = await prisma.user.update({
      where: { id: g.user.id },
      data: {
        name: parsed.data.name,
        ...(parsed.data.becomePractitioner && g.user.role === "TRAVELER" ? { role: "PRACTITIONER" as const } : {}),
      },
      select: { id: true, name: true, email: true },
    });
    await createSession(user); // refresh the cookie so the navbar shows the new name
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[profile] update failed", error);
    return fail("Gagal menyimpan profil", 500);
  }
}
