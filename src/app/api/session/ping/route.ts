import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/** Dipanggil SessionKeeper saat pengguna aktif; middleware memperbarui cookie-nya. Menjawab apakah sesi masih berlaku. */
export async function POST() {
  const session = await getSession();
  return NextResponse.json({ authenticated: !!session }, { headers: { "Cache-Control": "no-store" } });
}