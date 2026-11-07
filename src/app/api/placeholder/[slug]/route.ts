import { createHash } from "node:crypto";

// Generated placeholder artwork for cultural objects without a photo. Replace by setting
// `imageUrl` on the object (Prisma Studio, /pelaku, or the seed data).

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function hsv(h: number, s: number, v: number) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const [r, g, b] = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6];
  return "#" + [r, g, b].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const slug = params.slug.slice(0, 80);
  const hue = parseInt(createHash("md5").update(slug).digest("hex").slice(0, 4), 16) / 0xffff;
  const c1 = hsv(hue, 0.45, 0.85);
  const c2 = hsv((hue + 0.08) % 1, 0.6, 0.55);
  const label = slug
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ")
    .slice(0, 40);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 610 700" preserveAspectRatio="xMidYMid slice">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect width="610" height="700" fill="url(#g)"/>
  <circle cx="460" cy="170" r="70" fill="#fff" opacity="0.25"/>
  <path d="M0 520 Q150 430 300 500 T610 470 V700 H0Z" fill="#000" opacity="0.18"/>
  <text x="305" y="300" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="32" font-weight="600" fill="#fff" opacity="0.92">${esc(label)}</text>
  <text x="305" y="345" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="20" fill="#fff" opacity="0.7">foto menyusul</text>
</svg>`;

  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
}
