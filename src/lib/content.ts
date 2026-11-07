// Static content (navigation, FAQ, UMKM souvenirs). Cultural objects/events live in the database.

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

export type UmkmProduct = {
  id: string;
  name: string;
  umkm: string;
  city: string;
  price: number;
  image: string;
  /** Cerita budaya di balik oleh-oleh. */
  story: string;
};

export const umkmProducts: UmkmProduct[] = [
  {
    id: "bakpia",
    name: "Bakpia",
    umkm: "Bakpia Pathok 25",
    city: "Yogyakarta",
    price: 40_000,
    image: "/images/umkm/bakpia.svg",
    story: "Kue isi kacang hijau dari kawasan Pathuk yang berakar dari kue Tionghoa, lalu diadaptasi lidah Yogyakarta.",
  },
  {
    id: "cincin",
    name: "Cincin Ukir Filligri",
    umkm: "Kotagede Jewellry",
    city: "Yogyakarta",
    price: 200_000,
    image: "/images/umkm/cincin.svg",
    story: "Teknik filigri merangkai kawat perak halus, tradisi pengrajin Kotagede yang diwariskan antarkeluarga.",
  },
  {
    id: "gudeg",
    name: "Gudeg Kalengan",
    umkm: "Gudeg Bu Tjitro 1925",
    city: "Yogyakarta",
    price: 45_000,
    image: "/images/umkm/gudeg-kalengan.svg",
    story: "Gudeg dikemas agar bisa dibawa pulang: nangka muda yang dimasak lama dengan santan dan gula kelapa.",
  },
  {
    id: "syal",
    name: "Syal Batik Klasik",
    umkm: "Batik Rina",
    city: "Yogyakarta",
    price: 20_000,
    image: "/images/umkm/syal-batik.svg",
    story: "Batik adalah Warisan Budaya Takbenda UNESCO. Tanyakan makna motif pada pembatik sebelum membeli.",
  },
  {
    id: "andong",
    name: "Miniatur Andong Jogja",
    umkm: "Pengrajin Sentra Kayu",
    city: "Yogyakarta",
    price: 15_000,
    image: "/images/umkm/andong.svg",
    story: "Andong adalah kereta kuda yang menjadi bagian dari wajah Yogyakarta; miniaturnya dibuat pengrajin kayu setempat.",
  },
  {
    id: "wedang",
    name: "Wedang Uwuh Instan",
    umkm: "Sari Jampi",
    city: "Yogyakarta",
    price: 20_000,
    image: "/images/umkm/wedang-uwuh.svg",
    story: "Minuman rempah khas Imogiri, Bantul; dinamai 'uwuh' (sampah) karena rempahnya tampak seperti dedaunan kering.",
  },
];

/** Up to three souvenirs that fit the remaining budget, so leftover money has a cultural destination. */
export function pickSouvenirs(allowance: number, products: UmkmProduct[] = umkmProducts): UmkmProduct[] {
  if (allowance <= 0) return [];
  return products.filter((p) => p.price <= allowance).slice(0, 3);
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
