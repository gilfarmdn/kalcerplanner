import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, firstIssue, guard, readBody } from "@/lib/api";
import { verifySchema } from "@/lib/validators";

/** Curator (ADMIN) verifies or rejects a submitted object, and records the impact flags. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = await guard(["ADMIN"]);
  if (!g.ok) return g.error;

  const body = await readBody(req);
  if (body === null) return fail("Body tidak valid");
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { action, localRun, hiddenGem } = parsed.data;

  try {
    const result = await prisma.culturalObject.updateMany({
      where: { id: params.id },
      data:
        action === "VERIFY"
          ? {
              status: "VERIFIED",
              verifiedAt: new Date(),
              ...(localRun !== undefined ? { localRun } : {}),
              ...(hiddenGem !== undefined ? { hiddenGem } : {}),
            }
          : { status: "REJECTED", verifiedAt: null },
    });
    if (result.count === 0) return fail("Data tidak ditemukan", 404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[objects] verify failed", error);
    return fail("Gagal memperbarui status", 500);
  }
}
