import { NextResponse } from "next/server";

/** Respons galat untuk rute autentikasi (selalu bahasa Indonesia), dengan kode opsional untuk klien. */
export const err = (error: string, status = 400, code?: string) =>
  NextResponse.json({ error, ...(code ? { code } : {}) }, { status });

export const TOO_MANY = "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.";
