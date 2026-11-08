// Hash password dengan bcrypt. Satu-satunya tempat cost ditentukan (dipakai juga oleh prisma/seed.ts,
// jadi berkas ini sengaja tidak memakai alias "@/").
import bcrypt from "bcryptjs";

/** Cost 12 ≈ 250 ms per hash di server ini: cukup mahal untuk ditebak, masih cepat untuk login. */
export const BCRYPT_COST = 12;

// Hash acak untuk email yang tidak terdaftar, agar waktu jawab login sama dengan password salah
// (tanpa ini, email terdaftar bisa ditebak dari lamanya respons).
const DUMMY_HASH = "$2a$12$SitQEh9yBw7r0AC6HzUU6ewJV2b.B0L2AZ8wnC4vakwoSRPiSi8lO";

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_COST);

// Lama satu bcrypt.compare pada cost BCRYPT_COST, diukur dari panggilan dengan DUMMY_HASH.
let floorMs = 0;

/**
 * Selalu menjalankan bcrypt, juga ketika akunnya tidak ada (hash = null). Percobaan yang gagal ditahan
 * minimal selama satu hash cost BCRYPT_COST, agar akun dengan hash lama (cost lebih rendah) tidak bisa
 * dibedakan dari email yang tidak terdaftar lewat lamanya respons.
 */
export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  const start = performance.now();
  const ok = (await bcrypt.compare(password, hash ?? DUMMY_HASH)) && hash !== null;
  const elapsed = performance.now() - start;
  if (hash === null) floorMs = Math.max(floorMs * 0.8, elapsed);
  else if (!ok) {
    // Pertama kali: mengukur hash dummy sekaligus menjadi penahan waktunya.
    if (floorMs === 0) floorMs = await measureDummy();
    else if (elapsed < floorMs) await new Promise((r) => setTimeout(r, floorMs - elapsed));
  }
  return ok;
}

async function measureDummy(): Promise<number> {
  const start = performance.now();
  await bcrypt.compare("", DUMMY_HASH);
  return performance.now() - start;
}

/** Hash lama dengan cost lebih rendah diperbarui saat pengguna berhasil masuk. */
export const needsRehash = (hash: string) => bcrypt.getRounds(hash) < BCRYPT_COST;
