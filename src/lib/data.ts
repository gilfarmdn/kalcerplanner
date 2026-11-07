import { prisma } from "@/lib/prisma";
import { objectImage } from "@/lib/culture-db";

export type HighlightItem = { id: string; title: string; imageUrl: string; href: string };
export type ReviewItem = {
  id: string;
  authorName: string;
  authorRole: string | null;
  avatarUrl: string | null;
  rating: number;
  content: string;
};

export type LandingData = {
  highlights: HighlightItem[];
  reviews: ReviewItem[];
  rating: { average: number; count: number };
};

const fallback: LandingData = {
  highlights: [
    { id: "h1", title: "Menyusuri Sumbu Filosofi", imageUrl: "/api/placeholder/sumbu-filosofi", href: "/jelajah/sumbu-filosofi" },
    { id: "h2", title: "Belajar Batik di Giriloyo", imageUrl: "/api/placeholder/batik-giriloyo", href: "/jelajah/batik-giriloyo" },
    { id: "h3", title: "Wayang Kulit di Sonobudoyo", imageUrl: "/api/placeholder/wayang-kulit-sonobudoyo", href: "/jelajah/wayang-kulit-sonobudoyo" },
  ],
  reviews: [],
  rating: { average: 0, count: 0 },
};

/** Mengacak daftar (Fisher-Yates) lalu mengambil n item pertama. */
function pickRandom<T>(list: T[], n: number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

/** Loads landing-page content from PostgreSQL; falls back to static content if the DB is unreachable. */
export async function getLandingData(): Promise<LandingData> {
  try {
    const [objects, reviews, agg] = await Promise.all([
      prisma.culturalObject.findMany({
        where: { status: { in: ["SEED", "VERIFIED"] } },
        select: { id: true, slug: true, name: true, imageUrl: true },
      }),
      prisma.review.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: { id: true, authorName: true, authorRole: true, avatarUrl: true, rating: true, content: true },
      }),
      prisma.review.aggregate({
        where: { isPublished: true },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    const randomHighlights: HighlightItem[] = pickRandom(objects, 9).map((o) => ({
      id: o.id,
      title: o.name,
      imageUrl: objectImage(o),
      href: `/jelajah/${o.slug}`,
    }));

    return {
      highlights: randomHighlights.length ? randomHighlights : fallback.highlights,
      reviews,
      rating: {
        average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
        count: agg._count._all,
      },
    };
  } catch (error) {
    console.error("[getLandingData] database unavailable, using fallback content", error);
    return fallback;
  }
}

export type StoryItem = { id: string; name: string; origin: string; avatarUrl: string | null; content: string };

/** Cerita yang sudah dipublikasikan (maks. 5, terbaru dulu). Kosong kalau belum ada atau database tidak terbaca. */
export async function getStories(): Promise<StoryItem[]> {
  try {
    return await prisma.story.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, origin: true, avatarUrl: true, content: true },
    });
  } catch (error) {
    console.error("[getStories] database unavailable", error);
    return [];
  }
}
