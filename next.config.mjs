const isDev = process.env.NODE_ENV !== "production";

// Sumber luar yang dipakai situs: Cloudflare Turnstile (form daftar & lupa password) dan tile peta OpenStreetMap.
// 'unsafe-inline' pada script-src diperlukan karena Next.js menyisipkan skrip inline untuk hidrasi;
// 'unsafe-eval' hanya di mode dev (dipakai React Refresh).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://tile.openstreetmap.org",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Peramban hanya menerapkan HSTS lewat HTTPS (situs publik di Tailscale Funnel); di http://localhost diabaikan.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  webpack: (config, { dev }) => {
    // Cache disk webpack butuh banyak memori; di dev kita matikan agar tidak crash.
    if (dev) config.cache = false;
    return config;
  },
};

export default nextConfig;
