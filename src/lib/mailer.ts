// Pengiriman email lewat SMTP (nodemailer). Tanpa SMTP_HOST, isi email dicetak di terminal server
// supaya alur verifikasi dan reset password bisa dicoba tanpa layanan email sungguhan.

import nodemailer from "nodemailer";

export type Mail = { to: string; subject: string; text: string; html: string };

export async function sendMail(mail: Mail): Promise<void> {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    console.log(
      `\n[mailer] SMTP_HOST belum diisi, email TIDAK dikirim. Isi email untuk ${mail.to}:\n` +
        `  Subjek: ${mail.subject}\n\n${mail.text}\n`,
    );
    return;
  }

  const user = process.env.SMTP_USER?.trim();
  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true", // true untuk port 465; port 587 memakai STARTTLS otomatis
    auth: user ? { user, pass: process.env.SMTP_PASS ?? "" } : undefined,
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM?.trim() || `KalcerPlanner <${user ?? "no-reply@localhost"}>`,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}
