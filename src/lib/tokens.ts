// Token sekali pakai untuk verifikasi email dan reset password.
// Token asli hanya ada di tautan email; database menyimpan hash SHA-256-nya, jadi isi database yang bocor
// tidak bisa dipakai untuk mengambil alih akun.

import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export type TokenKind = "VERIFY_EMAIL" | "RESET_PASSWORD";

const TTL_MS: Record<TokenKind, number> = {
  VERIFY_EMAIL: 24 * 60 * 60 * 1000, // 24 jam
  RESET_PASSWORD: 60 * 60 * 1000, // 1 jam
};

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Membuat token baru; token lama dengan jenis yang sama untuk pengguna itu dihapus. */
export async function issueToken(userId: string, type: TokenKind): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await prisma.authToken.deleteMany({ where: { OR: [{ userId, type }, { expiresAt: { lt: new Date() } }] } });
  await prisma.authToken.create({
    data: { userId, type, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + TTL_MS[type]) },
  });
  return token;
}

/** Memakai token: berhasil hanya sekali, hanya untuk jenis yang benar, dan sebelum kedaluwarsa. */
export async function consumeToken(token: string, type: TokenKind): Promise<{ userId: string } | null> {
  const row = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt.getTime() < Date.now()) return null;

  // Penandaan atomik: kalau dua permintaan datang bersamaan, hanya satu yang menang.
  const marked = await prisma.authToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  return marked.count === 1 ? { userId: row.userId } : null;
}
