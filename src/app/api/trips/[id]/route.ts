import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, guard } from "@/lib/api";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const g = await guard();
  if (!g.ok) return g.error;
  try {
    const result = await prisma.trip.deleteMany({ where: { id: params.id, userId: g.user.id } });
    if (result.count === 0) return fail("Rencana tidak ditemukan", 404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[trips] delete failed", error);
    return fail("Gagal menghapus rencana", 500);
  }
}
