import { z } from "zod";
import { DEPTHS, INTERESTS, LODGINGS, OBJECT_KINDS, PACES, SLOTS, STYLES, TRANSPORTS, ZONES } from "@/lib/culture";

/** Wilayah diketik bebas; dirapikan agar "bantul " dan "BANTUL" tidak menjadi dua wilayah berbeda. */
function normalizeZone(raw: string): string {
  const clean = raw.trim().replace(/\s+/g, " ");
  const known = ZONES.find((z) => z.toLowerCase() === clean.toLowerCase());
  if (known) return known;
  return clean.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid");

const emailField = z.string().trim().toLowerCase().email("Email tidak valid").max(200);

const MAX_TRIP_DAYS = 7;

/** Input of the trip form (/rencana). Dates stay 'YYYY-MM-DD' strings; the planner works in UTC days. */
export const planInputSchema = z
  .object({
    startDate: dateString,
    endDate: dateString,
    adults: z.number().int().min(1, "Minimal 1 wisatawan dewasa").max(20),
    children: z.number().int().min(0).max(20),
    budget: z
      .number({ required_error: "Total anggaran wajib diisi", invalid_type_error: "Total anggaran tidak valid" })
      .int()
      .min(1, "Total anggaran wajib diisi dan harus lebih dari 0")
      .max(2_000_000_000),
    originCost: z.number().int().min(0).max(500_000_000).default(0),
    lodging: z.enum(LODGINGS).default("STANDAR"),
    rooms: z.number().int().min(1).max(20).default(1),
    includeSouvenir: z.boolean().default(false),
    includeMeals: z.boolean().default(true),
    transport: z.enum(TRANSPORTS).default("UMUM"),
    pace: z.enum(PACES).default("SEIMBANG"),
    zone: z.string().trim().max(60).optional(),
    interests: z.array(z.enum(INTERESTS)).max(INTERESTS.length).default([]),
    depth: z.enum(DEPTHS).default("BELAJAR"),
    spreadTourism: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    const start = Date.parse(`${v.startDate}T00:00:00Z`);
    const end = Date.parse(`${v.endDate}T00:00:00Z`);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      ctx.addIssue({ code: "custom", message: "Tanggal tidak valid", path: ["startDate"] });
      return;
    }
    if (end < start) {
      ctx.addIssue({ code: "custom", message: "Tanggal pulang tidak boleh sebelum tanggal pergi", path: ["endDate"] });
      return;
    }
    const days = Math.round((end - start) / 86_400_000) + 1;
    if (days > MAX_TRIP_DAYS) {
      ctx.addIssue({ code: "custom", message: `Rencana mendukung maksimal ${MAX_TRIP_DAYS} hari`, path: ["endDate"] });
    }
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (start < today.getTime()) {
      ctx.addIssue({ code: "custom", message: "Tanggal pergi tidak boleh di masa lalu", path: ["startDate"] });
    }
  });
export type PlanInputBody = z.infer<typeof planInputSchema>;

export const saveTripSchema = z.object({
  style: z.enum(STYLES),
  input: planInputSchema,
});

export const stampSchema = z.object({
  objectId: z.string().min(1).max(40),
  note: z.string().trim().max(500, "Catatan maksimal 500 karakter").optional(),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
  /** Travellers may upgrade themselves to practitioner; submissions still need curator verification. */
  becomePractitioner: z.boolean().optional(),
});

const lines = (max: number) =>
  z
    .string()
    .trim()
    .max(1500)
    .transform((v) =>
      v
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, max),
    );

const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam harus HH:MM");

/** A practitioner proposes a cultural object. It stays PENDING (hidden) until a curator verifies it. */
export const objectProposalSchema = z
  .object({
    name: z.string().trim().min(3, "Nama minimal 3 karakter").max(120),
    kind: z.enum(OBJECT_KINDS),
    interest: z.enum(INTERESTS),
    zone: z.string().trim().min(2, "Wilayah minimal 2 karakter").max(60).transform(normalizeZone),
    address: z.string().trim().max(200).optional(),
    lat: z.number().min(-90, "Koordinat tidak valid").max(90, "Koordinat tidak valid"),
    lng: z.number().min(-180, "Koordinat tidak valid").max(180, "Koordinat tidak valid"),
    summary: z.string().trim().min(20, "Ringkasan minimal 20 karakter").max(240),
    meaning: z.string().trim().min(40, "Jelaskan makna budaya minimal 40 karakter").max(1200),
    etiquette: lines(6),
    priceIdr: z.number().int().min(0).max(5_000_000),
    childPriceIdr: z.number().int().min(0, "Harga anak tidak valid").max(5_000_000).nullable().optional(),
    durationMin: z.number().int().min(15).max(480),
    // Kosong/null = tempat tidak memerlukan pendaftaran.
    dailyQuota: z.number().int().min(1, "Kuota minimal 1 orang").max(100_000).nullable().optional(),
    depth: z.enum(DEPTHS),
    slots: z.array(z.enum(SLOTS)).min(1, "Pilih minimal satu waktu kunjungan"),
    // 0 = Minggu ... 6 = Sabtu. Ketujuh hari dipilih = disimpan kosong (artinya setiap hari).
    weekdays: z
      .array(z.number().int().min(0).max(6))
      .min(1, "Pilih minimal satu hari kunjungan")
      .transform((days) => {
        const unique = [...new Set(days)].sort((a, b) => a - b);
        return unique.length === 7 ? [] : unique;
      }),
    openTime: timeOfDay,
    closeTime: timeOfDay,
    scheduleNote: z.string().trim().max(240).optional(),
    isEvent: z.boolean().default(false),
    eventStartsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal mulai tidak valid").optional(),
    eventEndsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal selesai tidak valid").optional(),
    eventRecurrence: z.enum(["ONCE", "YEARLY", "WEEKLY"]).default("ONCE"),
    eventWeekdays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
    eventExceptDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(100).default([]),
    imageUrl: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.closeTime > d.openTime, { message: "Jam tutup harus setelah jam buka", path: ["closeTime"] });

export const verifySchema = z.object({
  action: z.enum(["VERIFY", "REJECT"]),
  /** Curator's judgement: run by a local community / practitioner (counts toward the impact figure). */
  localRun: z.boolean().optional(),
  hiddenGem: z.boolean().optional(),
});

export const newsletterSchema = z.object({ email: emailField });

const GMAIL_DOMAINS = ["gmail.com", "googlemail.com"];
// Salah ketik domain Gmail yang sering terjadi; alamat seperti ini hampir pasti tidak akan menerima email.
const GMAIL_TYPOS = ["gmial.com", "gmai.com", "gmal.com", "gmil.com", "gmaill.com", "gamil.com", "gnail.com", "gmail.co", "gmail.con", "gmail.cm", "gmail.om", "gmail.id", "gmail.co.id", "gmail.net"];

/**
 * Aturan nama pengguna Gmail dari Google: 6–30 karakter, hanya huruf, angka, dan titik,
 * tidak diawali/diakhiri titik, dan tidak ada dua titik berurutan. Bagian setelah "+" adalah alias dan diabaikan.
 * Ada tidaknya akun dipastikan lewat tautan verifikasi yang dikirim ke alamat itu.
 */
function gmailProblem(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  const domain = email.slice(at + 1);
  if (GMAIL_TYPOS.includes(domain)) return "Domain email salah ketik. Maksud kamu @gmail.com?";
  if (!GMAIL_DOMAINS.includes(domain)) return null;
  const user = email.slice(0, at).split("+")[0];
  const bare = user.replace(/\./g, "");
  if (!/^[a-z0-9.]+$/.test(user)) return "Alamat Gmail hanya boleh berisi huruf, angka, dan titik";
  if (user.startsWith(".") || user.endsWith(".") || user.includes("..")) return "Alamat Gmail tidak valid (posisi titik salah)";
  if (bare.length < 6 || bare.length > 30) return "Alamat Gmail tidak valid (nama pengguna Gmail 6–30 karakter)";
  return null;
}

const strongPassword = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .max(72, "Password maksimal 72 karakter")
  .regex(/[a-z]/, "Password harus mengandung huruf kecil")
  .regex(/[A-Z]/, "Password harus mengandung huruf besar")
  .regex(/[0-9]/, "Password harus mengandung angka")
  .regex(/[^A-Za-z0-9]/, "Password harus mengandung simbol");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
    email: emailField.superRefine((email, ctx) => {
      const problem = gmailProblem(email);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    }),
    password: strongPassword,
    confirmPassword: z.string(),
    role: z.enum(["TRAVELER", "PRACTITIONER"]).default("TRAVELER"),
    next: z.string().max(2000).optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Konfirmasi password tidak sama",
    path: ["confirmPassword"],
  });

const tokenField = z.string().trim().min(20, "Tautan tidak valid").max(200, "Tautan tidak valid");
export const resetPasswordSchema = z.object({ token: tokenField, password: strongPassword });

export const emailOnlySchema = z.object({ email: emailField, next: z.string().max(2000).optional() });
export const verifyEmailSchema = z.object({ token: tokenField });

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password wajib diisi").max(72),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1, "Pilih rating bintang").max(5),
  content: z.string().trim().min(10, "Ulasan minimal 10 karakter").max(1000, "Ulasan maksimal 1000 karakter"),
});
