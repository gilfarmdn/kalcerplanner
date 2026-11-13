// Static content (navigation, FAQ). Cultural objects/events dan produk UMKM ada di database.

export { formatRupiah } from "./culture";

export const navLinks = [
  { href: "/", label: "Beranda" },
  { href: "/rencana", label: "Rencana" },
  { href: "/jelajah", label: "Jelajah" },
  { href: "/kalender", label: "Kalender" },
  { href: "/umkm", label: "Galeri UMKM" },
  { href: "/bantuan", label: "Bantuan" },
] as const;

/* ---------- Galeri UMKM ---------- */
// Produk UMKM disimpan di database (tabel UmkmProduct), bukan di sini: lihat src/lib/umkm.ts.

export type UmkmProduct = {
  id: string;
  name: string;
  umkm: string;
  /** Wilayah (kabupaten / kota), penamaan sama dengan `zone` objek dan event budaya. */
  zone: string;
  price: number;
  image: string;
  /** Cerita budaya di balik oleh-oleh. */
  story: string;
};

/**
 * Hingga tiga oleh-oleh yang muat di sisa anggaran dan berasal dari wilayah tempat-tempat di rencana
 * (`zones`), supaya sisa uang mengalir ke UMKM di tujuan yang sama. Tidak ada produk di wilayah itu = tidak ada saran.
 */
export function pickSouvenirs(allowance: number, zones: string[], products: UmkmProduct[]): UmkmProduct[] {
  if (allowance <= 0 || zones.length === 0) return [];
  const wanted = new Set(zones.map((z) => z.trim().toLowerCase()));
  return products.filter((p) => p.price <= allowance && wanted.has(p.zone.trim().toLowerCase())).slice(0, 3);
}

/* ---------- Bantuan (FAQ) ---------- */
// Questions come from the Figma design. The answers are draft copy — please review/edit.

export const faqs = [
  {
    q: "Apakah saya membutuhkan akun untuk membuat rencana ?",
    a: "Kamu bisa menjelajahi objek budaya, kalender, galeri UMKM, bahkan melihat hasil rekomendasi rencana tanpa akun. Akun diperlukan untuk menyimpan rencana ke My Trip dan mengumpulkan stempel Paspor Budaya",
  },
  {
    q: "Apakah rekomendasi yang diberikan menjamin alokasi anggaran maksimal saya ?",
    a: "Rekomendasi disusun mengikuti anggaran dan preferensi yang kamu isi. Biaya tiket, penginapan, dan makan adalah estimasi, bukan jaminan harga akhir. Cek harga dan jadwal ke pengelola sebelum berangkat.",
  },
  {
    q: "Apakah KalcerPlanner menyediakan panduan untuk transportasi lokal di kota tujuan ?",
    a: "Pada langkah Akomodasi & Transportasi di halaman Rencana, pilih moda yang kamu perlukan (transportasi umum, sewa motor, atau sewa mobil) agar estimasi biaya di dalam kota ikut dihitung. Rute antar tempat disusun berdasarkan kedekatan lokasi.",
  },
  {
    q: "Bagaimana cara memesan oleh-oleh khas UMKM lokal ?",
    a: "Saat ini KalcerPlanner belum memproses pembayaran. Galeri UMKM menampilkan produk beserta cerita budayanya, dan rencana perjalananmu menyisihkan saran oleh-oleh dari sisa anggaran. Pembelian dilakukan langsung ke pelaku usaha.",
  },
  {
    q: "Dari mana data budaya ini berasal dan seberapa akurat ?",
    a: "Data objek budaya disusun oleh tim dan diverifikasi bersama pengelola dan dinas terkait. Pelaku budaya dapat mendaftar untuk mengajukan atau memperbarui data mereka.",
  },
] as const;
