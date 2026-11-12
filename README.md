# KalcerPlanner.id

Platform perjalanan budaya Indonesia.
Bukan sekadar itinerary: setiap rekomendasi menjelaskan *mengapa* dipilih, *apa maknanya*, *bagaimana bersikap*, dan *berapa rupiah yang mengalir ke pelaku budaya setempat*.

**Stack:** Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Prisma 5 · PostgreSQL 16 · Docker

## Menjalankan (Docker)

```bash
cp .env.example .env        # lalu ubah POSTGRES_PASSWORD dan AUTH_SECRET (wajib)
docker compose up --build
```

Buka http://localhost:3000. Compose menjalankan PostgreSQL, job `migrate` satu kali (membuat tabel; data sampel Yogyakarta hanya dibuat bila `SEED_SAMPLE_DATA=true`), lalu aplikasi.

- **Akun kurator (opsional):** isi `ADMIN_EMAIL` dan `ADMIN_PASSWORD` di `.env` sebelum `docker compose up`. Seed membuat akun ADMIN yang bisa memverifikasi pengajuan di `/admin`.
- **Upgrade dari versi sebelumnya:** skema berubah besar (tabel `TripRequest` dan `Partner` dihapus). Jalankan sekali `docker compose down -v` lalu `docker compose up --build` agar database dibuat ulang. Data lama (akun, rencana lama) ikut terhapus.
- Jika mengubah nilai `POSTGRES_*` setelah run pertama, reset volume dengan `docker compose down -v`.

## Pengembangan lokal

```bash
cp .env.example .env
docker compose up -d db
npm install                 # juga menjalankan `prisma generate`
npm run db:push             # buat tabel
npm run db:seed             # akun kurator; tambahkan SEED_SAMPLE_DATA=true untuk data sampel Yogyakarta
npm run dev
npm run check:planner       # uji mesin rekomendasi (tanpa database)
```

## Fitur dan halaman

| Rute | Isi |
| --- | --- |
| `/` | Landing: hero, highlight, keunggulan, statistik pilot nyata dari database |
| `/rencana` | Form lengkap → **3 gaya rencana** (Seimbang, Mendalam & Berdampak, Hemat Cerdas) dengan alasan tiap tempat, rincian biaya, dampak lokal, saran oleh-oleh dari sisa anggaran. Terbuka tanpa login; **menyimpan ke My Trip wajib login** |
| `/trip`, `/trip/[id]` | **Wisatawan** — My Trip: daftar dan detail rencana tersimpan; klaim stempel setelah hari keberangkatan |
| `/jejak` | **Paspor Budaya**: stempel, catatan "yang kupelajari", lencana per tema, dampak teralokasi |
| `/profil` | Nama dan foto profil |
| `/jelajah`, `/jelajah/[slug]` | Objek budaya dari database: makna ("Mengapa ini penting"), etika berkunjung, info praktis, event terkait |
| `/kalender` | Event tahunan/periodik + pertunjukan rutin |
| `/destinasi` (`/tambah`, `/[id]`, `/kunjungan`, `/profil`) | **Pelaku budaya** — My Destination: mengajukan dan mengelola tempat/kegiatan, riwayat kunjungan |
| `/admin` (`/akun`, `/profil`) | **Kurator (ADMIN)** — kurasi: memverifikasi/menolak dan menandai "dikelola pelaku setempat"; kelola akun |
| `/pelaku/*` | Alamat lama; dialihkan otomatis ke `/destinasi/*` atau `/admin/*` |
| `/umkm` | Galeri UMKM dengan cerita di balik tiap oleh-oleh |
| `/bantuan` | Ulasan (menunggu moderasi) + FAQ |
| `/masuk`, `/daftar` | Login / daftar (wisatawan atau pelaku budaya). Setelah login selalu ke halaman utama akun: wisatawan `/trip`, pelaku budaya `/destinasi`, kurator `/admin` (kecuali wisatawan yang masuk dari "Simpan Rencana") |

## Keamanan

- **Password**: bcrypt cost 12 (`src/lib/password.ts`). Hash lama dengan cost lebih rendah diperbarui otomatis saat pengguna berhasil masuk. Login tetap menjalankan bcrypt untuk email tak dikenal agar lama respons tidak membocorkan email yang terdaftar.
- **Header keamanan** (`next.config.mjs`): Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- **Cloudflare Turnstile** pada form daftar dan lupa password (`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`). Bila kosong, pemeriksaan dilewati (hanya untuk pengembangan lokal).
- **Batas permintaan** per IP dan per email/akun untuk login, daftar, lupa password, newsletter, ulasan, dan pendaftaran kunjungan (`src/lib/rate-limit.ts`, di memori proses). IP diambil dari entri terakhir `X-Forwarded-For` yang ditambahkan proxy.
- **Gmail**: alamat `@gmail.com` harus mengikuti aturan nama pengguna Gmail; akun baru aktif setelah tautan verifikasi diklik. Lupa password hanya mengirim tautan ke email yang terdaftar.
- **Cookie sesi**: httpOnly, SameSite=Lax; set `COOKIE_SECURE=true` bila situs disajikan lewat HTTPS.

### Yang sengaja dihapus dari desain Figma awal
Pembayaran/"Bayar" dan "Pesan Sekarang", pilihan maskapai & bintang hotel sebagai inti hasil, "Riwayat Transaksi" (diganti **Jejak Budaya**), dan strip "Mitra Perjalanan" generik. KalcerPlanner tidak memproses pembayaran; pengguna memesan langsung ke pengelola.

## Cara kerja mesin rekomendasi (`src/lib/planner.ts`)

Aturan deterministik dan dapat dijelaskan, bukan kotak hitam:

1. Skor tiap objek dari **minat** (utama/tambahan), **kedalaman** (menikmati → belajar → terlibat), **dikelola pelaku setempat**, **kurang padat** (dan "sebarkan kunjungan"), harga (khusus Hemat), serta **jarak** ke agenda lain hari itu (haversine).
2. Hanya memilih tempat yang **buka pada hari itu** (`weekdays`) dan muat di slot waktu (`slots` × durasi).
3. Total disesuaikan dengan anggaran setelah biaya dasar (makan, penginapan, transportasi lokal, biaya ke Yogyakarta isian pengguna) dan cadangan oleh-oleh; bila biaya dasar saja melebihi anggaran, hanya tempat gratis yang ditawarkan, disertai catatan.
4. Setiap tempat membawa daftar `reasons`; hasil disimpan sebagai snapshot di `TripItem`. Saat menyimpan, **server menghitung ulang** rencana (tidak mempercayai harga dari browser).

**Angka "dampak lokal"** = total tiket/kelas pada tempat yang ditandai `localRun` (dikelola pelaku/komunitas/lembaga budaya setempat) ÷ total tiket. Penandaan itu keputusan kurator; ini perkiraan alokasi, bukan data transaksi riil.

## Mengganti gambar placeholder

- `public/images/logo/logo.png` — logo asli; `logo-trim.png` (potongan untuk navbar, login, footer, dasbor) dan `src/app/icon.png` (favicon) dibuat darinya
- `public/images/hero.svg` — latar hero / login / banner Jelajah
- `public/images/umkm/*.svg` — 6 produk UMKM (ubah path di `src/lib/content.ts`)
- `public/images/avatar.svg` — avatar ulasan
- Objek budaya: set `imageUrl` per objek (Prisma Studio atau `/destinasi`)

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

- Stempel Paspor Budaya hanya bisa diklaim untuk tempat dalam rencana milik sendiri, mulai hari keberangkatan. Itu pencegahan penyalahgunaan ringan, bukan bukti kehadiran (belum ada geofence/QR).
- Tidak ada `package-lock.json`; jalankan `npm install` sekali lalu commit (Dockerfile memakai `npm ci` jika ada).
- Set `COOKIE_SECURE=true` bila diakses lewat HTTPS. Untuk produksi, ganti `prisma db push` dengan `prisma migrate`.
