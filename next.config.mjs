/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  webpack: (config, { dev }) => {
    // Cache disk webpack butuh banyak memori; di dev kita matikan agar tidak crash.
    if (dev) config.cache = false;
    return config;
  },
};

export default nextConfig;