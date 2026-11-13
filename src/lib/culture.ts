// Shared vocabulary for the culture layer. Pure TypeScript (no framework imports) so the
// planner can run anywhere. Values mirror the Prisma enums in prisma/schema.prisma.

export const INTERESTS = [
  "SEJARAH_CAGAR",
  "MUSEUM",
  "SENI_PERTUNJUKAN",
  "ADAT_RITUS",
  "KULINER_TRADISIONAL",
  "KERAJINAN",
  "BAHASA_AKSARA",
  "PERMAINAN_TRADISIONAL",
  "KAMPUNG_KOMUNITAS",
] as const;
export type Interest = (typeof INTERESTS)[number];

export const interestInfo: Record<Interest, { label: string; hint: string; slug: string }> = {
  SEJARAH_CAGAR: { label: "Situs Sejarah & Cagar Budaya", hint: "Candi, keraton, benteng, kawasan pusaka", slug: "situs-sejarah" },
  MUSEUM: { label: "Museum", hint: "Koleksi seni, sejarah, dan tokoh", slug: "museum" },
  SENI_PERTUNJUKAN: { label: "Seni Pertunjukan", hint: "Tari, wayang, sendratari, karawitan", slug: "seni-pertunjukan" },
  ADAT_RITUS: { label: "Adat, Tradisi & Ritus", hint: "Upacara, sumbu filosofi, tata laku", slug: "adat-tradisi" },
  KULINER_TRADISIONAL: { label: "Kuliner & Pengetahuan Tradisional", hint: "Makanan khas, jamu, cara pembuatan", slug: "kuliner" },
  KERAJINAN: { label: "Kerajinan & Workshop", hint: "Batik, perak, gerabah, belajar langsung", slug: "kerajinan" },
  BAHASA_AKSARA: { label: "Bahasa, Aksara & Naskah", hint: "Aksara Jawa, naskah, tutur", slug: "bahasa-aksara" },
  PERMAINAN_TRADISIONAL: { label: "Permainan & Olahraga Tradisional", hint: "Jemparingan, dolanan anak", slug: "permainan-tradisional" },
  KAMPUNG_KOMUNITAS: { label: "Kampung & Komunitas Budaya", hint: "Kawasan hidup yang dijaga warganya", slug: "kampung-komunitas" },
};

/** Paspor Budaya badge earned with the first stamp in each interest. */
export const badgeName: Record<Interest, string> = {
  SEJARAH_CAGAR: "Penjaga Situs",
  MUSEUM: "Pemburu Koleksi",
  SENI_PERTUNJUKAN: "Penikmat Panggung",
  ADAT_RITUS: "Murid Tata Laku",
  KULINER_TRADISIONAL: "Pencicip Warisan",
  KERAJINAN: "Tangan Pengrajin",
  BAHASA_AKSARA: "Pembaca Aksara",
  PERMAINAN_TRADISIONAL: "Pemain Tradisi",
  KAMPUNG_KOMUNITAS: "Tamu Kampung",
};

export const OBJECT_KINDS = ["SITUS", "MUSEUM", "PERTUNJUKAN", "KULINER", "WORKSHOP", "KAMPUNG", "PASAR", "RUTE"] as const;
export type ObjectKind = (typeof OBJECT_KINDS)[number];
export const kindLabel: Record<ObjectKind, string> = {
  SITUS: "Situs",
  MUSEUM: "Museum",
  PERTUNJUKAN: "Pertunjukan",
  KULINER: "Kuliner",
  WORKSHOP: "Workshop",
  KAMPUNG: "Kampung budaya",
  PASAR: "Pasar tradisional",
  RUTE: "Rute jalan kaki",
};

export const DEPTHS = ["LIHAT", "BELAJAR", "TERLIBAT"] as const;
export type Depth = (typeof DEPTHS)[number];
export const depthInfo: Record<Depth, { label: string; hint: string }> = {
  LIHAT: { label: "Menikmati", hint: "Melihat dan mengamati" },
  BELAJAR: { label: "Belajar", hint: "Ada pemandu / penjelasan dari pelaku" },
  TERLIBAT: { label: "Terlibat langsung", hint: "Praktik sendiri" },
};

export const SLOTS = ["PAGI", "SIANG", "SORE", "MALAM"] as const;
export type Slot = (typeof SLOTS)[number];
/** Start time shown to the user and the longest activity (minutes) that still fits before the next slot. */
export const slotInfo: Record<Slot, { label: string; start: string; capacityMin: number }> = {
  PAGI: { label: "Pagi", start: "09.00", capacityMin: 240 },
  SIANG: { label: "Siang", start: "13.00", capacityMin: 180 },
  SORE: { label: "Sore", start: "16.00", capacityMin: 150 },
  MALAM: { label: "Malam", start: "19.30", capacityMin: 150 },
};

export const LODGINGS = ["NONE", "HEMAT", "STANDAR", "NYAMAN"] as const;
export type Lodging = (typeof LODGINGS)[number];
export const lodgingInfo: Record<Lodging, { label: string; hint: string; perRoomNight: number }> = {
  NONE: { label: "Tanpa penginapan", hint: "Tidak dihitung", perRoomNight: 0 },
  HEMAT: { label: "Hemat", hint: "Hostel / penginapan sederhana", perRoomNight: 250_000 },
  STANDAR: { label: "Standar", hint: "Hotel bintang 2–3", perRoomNight: 450_000 },
  NYAMAN: { label: "Nyaman", hint: "Hotel bintang 4 ke atas", perRoomNight: 850_000 },
};

/** Tempo perjalanan: seberapa banyak destinasi per hari. */
export const PACES = ["SANTAI", "SEIMBANG", "PADAT"] as const;
export type Pace = (typeof PACES)[number];
export const paceInfo: Record<Pace, { label: string; hint: string }> = {
  SANTAI: { label: "Santai", hint: "Sedikit destinasi, banyak waktu luang" },
  SEIMBANG: { label: "Seimbang", hint: "Destinasi dan istirahat berimbang" },
  PADAT: { label: "Padat", hint: "Sebanyak mungkin destinasi" },
};

/**
 * Moda transportasi di kota tujuan. `perDay` = perkiraan biaya per hari untuk satu kelompok.
 * Angka ini PERKIRAAN awal (belum diverifikasi) — sesuaikan dengan harga setempat.
 */
export const TRANSPORTS = ["NONE", "UMUM", "MOTOR", "MOBIL"] as const;
export type Transport = (typeof TRANSPORTS)[number];
export const transportInfo: Record<Transport, { label: string; hint: string; perDay: number }> = {
  NONE: { label: "Tidak perlu", hint: "Jalan kaki atau sudah punya kendaraan", perDay: 0 },
  UMUM: { label: "Transportasi umum & ojek online", hint: "Bus kota, taksi, ojek online", perDay: 60_000 },
  MOTOR: { label: "Sewa motor", hint: "Fleksibel untuk rute antar kampung", perDay: 150_000 },
  MOBIL: { label: "Sewa mobil", hint: "Nyaman untuk keluarga atau rombongan", perDay: 700_000 },
};

export const STYLES = ["SEIMBANG", "MENDALAM", "HEMAT"] as const;
export type PlanStyle = (typeof STYLES)[number];
export const styleLabel: Record<PlanStyle, string> = {
  SEIMBANG: "Seimbang",
  MENDALAM: "Mendalam & Berdampak",
  HEMAT: "Hemat Cerdas",
};

export const weekdayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;
export const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
] as const;

export const SOURCE_NOTE_SUBMITTED = "Diajukan pelaku budaya melalui KalcerPlanner";

/**
 * Cost assumptions. These are *estimates* shown to the user as such — tune them or replace with real data.
 */
export const COST = {
  mealPerAdultDay: 60_000,
  childFactor: 0.7, // meals
  childTicketFactor: 0.5,
} as const;

export const formatRupiah = (n: number) => `Rp. ${Math.round(n).toLocaleString("id-ID")}`;

export const isInterest = (v: unknown): v is Interest => typeof v === "string" && (INTERESTS as readonly string[]).includes(v);
