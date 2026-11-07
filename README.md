# KalcerPlanner.id

Platform perjalanan budaya Indonesia. **Pilot: Daerah Istimewa Yogyakarta.**
Bukan sekadar itinerary: setiap rekomendasi menjelaskan *mengapa* dipilih, *apa maknanya*, *bagaimana bersikap*, dan *berapa rupiah yang mengalir ke pelaku budaya setempat*.

**Stack:** Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Prisma 5 · PostgreSQL 16 · Docker

## Menjalankan (Docker)

```bash
cp .env.example .env        # lalu ubah POSTGRES_PASSWORD dan AUTH_SECRET (wajib)
docker compose up --build
```

Buka http://localhost:3000. Compose menjalankan PostgreSQL, job `migrate` satu kali (membuat tabel + seed data Yogyakarta), lalu aplikasi.

- **Akun kurator (opsional):** isi `ADMIN_EMAIL` dan `ADMIN_PASSWORD` di `.env` sebelum `docker compose up`. Seed membuat akun ADMIN yang bisa memverifikasi pengajuan di `/pelaku`.
- **Upgrade dari versi sebelumnya:** skema berubah besar (tabel `TripRequest` dan `Partner` dihapus). Jalankan sekali `docker compose down -v` lalu `docker compose up --build` agar database dibuat ulang. Data lama (akun, rencana lama) ikut terhapus.
- Jika mengubah nilai `POSTGRES_*` setelah run pertama, reset volume dengan `docker compose down -v`.

## Pengembangan lokal

```bash
cp .env.example .env
docker compose up -d db
npm install                 # juga menjalankan `prisma generate`
npm run db:push             # buat tabel
npm run db:seed             # data budaya Yogyakarta + konten landing
npm run dev
npm run check:planner       # uji mesin rekomendasi (tanpa database)
```

## Fitur dan halaman

| Rute | Isi |
| --- | --- |
| `/` | Landing: hero + kotak RENCANA (pengunjung diarahkan ke login), highlight, keunggulan, statistik pilot nyata dari database |
| `/rencana` | Form lengkap → **3 gaya rencana** (Seimbang, Mendalam & Berdampak, Hemat Cerdas) dengan alasan tiap tempat, rincian biaya, dampak lokal, saran oleh-oleh dari sisa anggaran. **Cek Rekomendasi wajib login** |
| `/trip`, `/trip/[id]` | My Trip: daftar dan detail rencana tersimpan; klaim stempel setelah hari keberangkatan |
| `/jejak` | **Paspor Budaya**: stempel, catatan "yang kupelajari", lencana per tema, dampak teralokasi |
| `/profil` | Nama dan minat favorit (mengisi form Rencana) |
| `/jelajah`, `/jelajah/[slug]` | Objek budaya dari database: makna ("Mengapa ini penting"), etika berkunjung, info praktis, event terkait |
| `/kalender` | Event tahunan/periodik + pertunjukan rutin |
| `/pelaku` | **Pelaku budaya** mengajukan tempat/kegiatan; **kurator (ADMIN)** memverifikasi/menolak dan menandai "dikelola pelaku setempat" |
| `/umkm` | Galeri UMKM dengan cerita di balik tiap oleh-oleh |
| `/bantuan` | Ulasan (menunggu moderasi) + FAQ |
| `/masuk`, `/daftar` | Login / daftar (wisatawan atau pelaku budaya) |

### Yang sengaja dihapus dari desain Figma awal
Pembayaran/"Bayar" dan "Pesan Sekarang", pilihan maskapai & bintang hotel sebagai inti hasil, "Riwayat Transaksi" (diganti **Jejak Budaya**), dan strip "Mitra Perjalanan" generik. KalcerPlanner tidak memproses pembayaran; pengguna memesan langsung ke pengelola.

## Cara kerja mesin rekomendasi (`src/lib/planner.ts`)

Aturan deterministik dan dapat dijelaskan, bukan kotak hitam:

1. Skor tiap objek dari **minat** (utama/tambahan), **kedalaman** (menikmati → belajar → terlibat), **dikelola pelaku setempat**, **kurang padat** (dan "sebarkan kunjungan"), harga (khusus Hemat), serta **jarak** ke agenda lain hari itu (haversine).
2. Hanya memilih tempat yang **buka pada hari itu** (`weekdays`) dan muat di slot waktu (`slots` × durasi).
3. Total disesuaikan dengan anggaran setelah biaya dasar (makan, penginapan, transportasi lokal, biaya ke Yogyakarta isian pengguna) dan cadangan oleh-oleh; bila biaya dasar saja melebihi anggaran, hanya tempat gratis yang ditawarkan, disertai catatan.
4. Setiap tempat membawa daftar `reasons`; hasil disimpan sebagai snapshot di `TripItem`. Saat menyimpan, **server menghitung ulang** rencana (tidak mempercayai harga dari browser).

**Angka "dampak lokal"** = total tiket/kelas pada tempat yang ditandai `localRun` (dikelola pelaku/komunitas/lembaga budaya setempat) ÷ total tiket. Penandaan itu keputusan kurator; ini perkiraan alokasi, bukan data transaksi riil.

## Data pilot: baca ini sebelum demo

`prisma/data/yogyakarta.ts` berisi **30 objek budaya** dan **6 event**. Itu kerangka awal yang disusun tim:

- Harga tiket, jam buka, **jadwal pentas**, dan koordinat adalah **perkiraan** dan **belum diverifikasi**. Objek berstatus `SEED` dan tampil dengan label "Data pilot · menunggu verifikasi" di aplikasi.
- Tanggal event tidak diisi pasti (banyak yang mengikuti kalender Jawa/Hijriah); aplikasi menampilkan petunjuk bulan atau catatan kalender dan meminta pengguna mengecek kanal resmi.
- Asumsi biaya (makan Rp60.000/hari/dewasa, transportasi lokal Rp60.000/hari, tarif kamar per kelas, tiket anak 50%) ada di `src/lib/culture.ts` (`COST`, `lodgingInfo`). Itu estimasi.
- Sebelum dipakai di luar demo: verifikasi ke pengelola/Dinas Kebudayaan DIY, lalu ubah status menjadi `VERIFIED` lewat `/pelaku` (akun ADMIN) atau Prisma Studio. Seed ulang hanya menimpa objek yang masih `SEED`; objek `VERIFIED` tidak pernah ditimpa.
- Foto belum ada: aplikasi memakai gambar placeholder dinamis `/api/placeholder/<slug>`. Isi kolom `imageUrl` untuk mengganti.

## Mengganti gambar placeholder

- `public/images/logo/logo.png` — logo asli; `logo-trim.png` (potongan untuk navbar, login, footer, dasbor) dan `src/app/icon.png` (favicon) dibuat darinya
- `public/images/hero.svg` — latar hero / login / banner Jelajah
- `public/images/umkm/*.svg` — 6 produk UMKM (ubah path di `src/lib/content.ts`)
- `public/images/avatar.svg` — avatar ulasan
- Objek budaya: set `imageUrl` per objek (Prisma Studio atau `/pelaku`)

## Skrip

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server pengembangan |
| `npm run build` / `npm start` | Build / server produksi |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run check:planner` | Uji invarian mesin rekomendasi dan data seed |
| `npm run db:push` | Sinkronkan skema Prisma ke database |
| `npm run db:seed` | Seed (aman diulang) |
| `npm run db:studio` | Prisma Studio (moderasi ulasan: `isPublished`; ubah status objek) |

## Catatan

- Kode ini **belum pernah dibuild/ditest end-to-end** di lingkungan pembuatnya (registri npm tidak dapat diakses). Mesin rekomendasi dan data seed lulus `npm run check:planner`. Jalankan `npm install && npm run typecheck && npm run build` di mesinmu, dan perbaiki bila ada galat tipe yang terlewat.
- Pilot dibatasi 7 hari per rencana dan satu wilayah (DIY).
- Belum ada rate limiting, verifikasi email, atau reset password. Tambahkan sebelum dipublikasikan.
- Stempel Paspor Budaya hanya bisa diklaim untuk tempat dalam rencana milik sendiri, mulai hari keberangkatan. Itu pencegahan penyalahgunaan ringan, bukan bukti kehadiran (belum ada geofence/QR).
- Tidak ada `package-lock.json`; jalankan `npm install` sekali lalu commit (Dockerfile memakai `npm ci` jika ada).
- Set `COOKIE_SECURE=true` bila diakses lewat HTTPS. Untuk produksi, ganti `prisma db push` dengan `prisma migrate`.
