// Isi email untuk verifikasi akun dan reset password (bahasa Indonesia).

import { safeNext } from "@/lib/safe-next";
import { sendMail } from "@/lib/mailer";

/**
 * Alamat dasar untuk tautan di email. Di production APP_URL WAJIB diisi: memakai alamat dari permintaan
 * berisiko, karena header Host bisa dipalsukan penyerang agar tautan reset mengarah ke situs lain.
 */
function appUrl(req: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") throw new Error("APP_URL belum diisi (wajib di production)");
  return new URL(req.url).origin;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

function render(opts: { name: string; intro: string; button: string; url: string; outro: string }) {
  const text = `Halo ${opts.name},\n\n${opts.intro}\n\n${opts.url}\n\n${opts.outro}\n\nKalcerPlanner`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1e1e1e">
  <p>Halo ${escapeHtml(opts.name)},</p>
  <p>${escapeHtml(opts.intro)}</p>
  <p><a href="${escapeHtml(opts.url)}" style="display:inline-block;background:#0b5040;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${escapeHtml(opts.button)}</a></p>
  <p style="font-size:13px;color:#555">Jika tombol tidak berfungsi, salin tautan ini ke browser:<br><span style="word-break:break-all">${escapeHtml(opts.url)}</span></p>
  <p style="font-size:13px;color:#555">${escapeHtml(opts.outro)}</p>
  <p style="font-size:13px;color:#555">KalcerPlanner</p>
</div>`;
  return { text, html };
}

export async function sendVerificationEmail(
  req: Request,
  user: { name: string; email: string },
  token: string,
  next?: string,
) {
  const params = new URLSearchParams({ token });
  const safe = safeNext(next, "");
  if (safe) params.set("next", safe);
  const url = `${appUrl(req)}/verifikasi?${params.toString()}`;
  const { text, html } = render({
    name: user.name,
    intro: "Terima kasih telah mendaftar di KalcerPlanner. Verifikasi alamat email kamu agar akun bisa dipakai.",
    button: "Verifikasi email",
    url,
    outro: "Tautan berlaku 24 jam. Jika kamu tidak merasa mendaftar, abaikan email ini.",
  });
  await sendMail({ to: user.email, subject: "Verifikasi email KalcerPlanner", text, html });
}

export async function sendResetEmail(req: Request, user: { name: string; email: string }, token: string) {
  const url = `${appUrl(req)}/reset-password?token=${encodeURIComponent(token)}`;
  const { text, html } = render({
    name: user.name,
    intro: "Kami menerima permintaan untuk mengatur ulang password akun KalcerPlanner kamu.",
    button: "Atur ulang password",
    url,
    outro: "Tautan berlaku 1 jam dan hanya bisa dipakai sekali. Jika kamu tidak memintanya, abaikan email ini; password kamu tidak berubah.",
  });
  await sendMail({ to: user.email, subject: "Atur ulang password KalcerPlanner", text, html });
}
