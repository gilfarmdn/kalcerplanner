// Cloudflare Turnstile (pengganti CAPTCHA) untuk form publik yang mengirim email: daftar dan lupa password.
// Kunci diambil dari env saat runtime: TURNSTILE_SITE_KEY (publik, dikirim ke browser) dan TURNSTILE_SECRET_KEY (rahasia).
// Bila belum diisi, pemeriksaan dilewati (untuk pengembangan lokal) dan server mencatat peringatan.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const secretKey = () => process.env.TURNSTILE_SECRET_KEY?.trim() || null;

/** Site key untuk browser, atau null bila Turnstile tidak aktif (aktif hanya jika KEDUA kunci terisi). */
export const turnstileSiteKey = () => (secretKey() && process.env.TURNSTILE_SITE_KEY?.trim()) || null;

let warned = false;

/** true bila token Turnstile sah untuk permintaan ini (atau Turnstile belum dikonfigurasi). */
export async function verifyTurnstile(token: unknown, ip: string): Promise<boolean> {
  const secret = secretKey();
  if (!secret || !turnstileSiteKey()) {
    if (!warned) {
      console.warn("[turnstile] TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY belum lengkap; pemeriksaan bot dilewati.");
      warned = true;
    }
    return true;
  }
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return false;

  const form = new URLSearchParams({ secret, response: token });
  if (ip !== "unknown") form.set("remoteip", ip);
  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body: form, signal: AbortSignal.timeout(8000), cache: "no-store" });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch (error) {
    // Gagal menghubungi Cloudflare: tolak (lebih aman daripada meloloskan bot).
    console.error("[turnstile] verifikasi gagal", error);
    return false;
  }
}

export const TURNSTILE_FAILED = "Verifikasi keamanan gagal. Muat ulang halaman lalu coba lagi.";
