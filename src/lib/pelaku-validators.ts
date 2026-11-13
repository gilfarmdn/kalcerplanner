import { z } from "zod";

const dateString = z
  .string({ required_error: "Tanggal wajib diisi", invalid_type_error: "Tanggal tidak valid" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Tanggal tidak valid");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter`)
    .optional()
    .transform((v) => (v ? v : undefined));

export const VISIT_STATUSES = ["BOOKED", "ATTENDED", "CANCELLED"] as const;
export const visitStatusLabel: Record<(typeof VISIT_STATUSES)[number], string> = {
  BOOKED: "Terdaftar",
  ATTENDED: "Hadir",
  CANCELLED: "Batal",
};

const visitBase = {
  objectId: z.string().min(1, "Pilih destinasi").max(40).optional(),
  eventId: z.string().max(40).nullable().optional(),
  visitorName: z.string().trim().min(2, "Nama pengunjung minimal 2 karakter").max(80),
  contact: optionalText(80),
  partySize: z.number({ invalid_type_error: "Jumlah orang tidak valid" }).int().min(1, "Minimal 1 orang").max(500),
  visitDate: dateString,
  note: optionalText(300),
};

/** Pelaku mencatat kunjungan (mis. tamu walk-in). */
export const visitCreateSchema = z
  .object({ ...visitBase, status: z.enum(VISIT_STATUSES).default("ATTENDED") })
  .refine((d) => !!d.objectId || !!d.eventId, { message: "Pilih destinasi atau event", path: ["objectId"] });

/** Ubah sebagian data kunjungan. */
export const visitUpdateSchema = z
  .object({
    visitorName: visitBase.visitorName,
    contact: z.string().trim().max(80).nullable(),
    partySize: visitBase.partySize,
    visitDate: dateString,
    note: z.string().trim().max(300).nullable(),
    status: z.enum(VISIT_STATUSES),
    eventId: z.string().max(40).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Tidak ada perubahan");

/** Wisatawan mendaftar kunjungan sendiri dari halaman objek. */
export const publicVisitSchema = z
  .object({
    objectId: visitBase.objectId,
    eventId: visitBase.eventId,
    partySize: visitBase.partySize,
    visitDate: dateString,
    contact: optionalText(80),
    note: optionalText(300),
  })
  .refine((d) => !!d.objectId || !!d.eventId, { message: "Tujuan pendaftaran tidak valid" });

export const eventSchema = z
  .object({
    title: z.string().trim().min(3, "Judul minimal 3 karakter").max(120),
    description: z.string().trim().min(10, "Deskripsi minimal 10 karakter").max(1500),
    objectId: z.string().min(1, "Pilih destinasi").max(40),
    startsOn: dateString,
    endsOn: dateString.optional(),
    recurrence: z.enum(["ONCE", "YEARLY", "WEEKLY"]).default("ONCE"),
    weekdays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
    exceptDates: z.array(dateString).max(100).default([]),
    venue: z.string({ required_error: "Lokasi wajib diisi" }).trim().min(1, "Lokasi wajib diisi").max(120, "Maksimal 120 karakter"),
    isActive: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (v.recurrence === "WEEKLY" && v.weekdays.length === 0) {
      ctx.addIssue({ code: "custom", message: "Pilih minimal satu hari berlangsung", path: ["weekdays"] });
    }
    if (v.endsOn && v.endsOn < v.startsOn) {
      ctx.addIssue({ code: "custom", message: "Tanggal selesai tidak boleh sebelum tanggal mulai", path: ["endsOn"] });
    }
  });
