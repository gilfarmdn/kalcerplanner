import Hero from "@/components/Hero";
import Highlights from "@/components/Highlights";
import PlatformStats from "@/components/PlatformStats";
import Stories from "@/components/Stories";
import SiteShell from "@/components/SiteShell";
import ValueProps from "@/components/ValueProps";
import { getLandingData, getStories } from "@/lib/data";

// Content comes from PostgreSQL and the session cookie, so render per request
// (this also lets `next build` run without a database).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ highlights }, stories] = await Promise.all([getLandingData(), getStories()]);

  return (
    <SiteShell publicChrome>
      <Hero />
      <Highlights items={highlights} />
      <ValueProps />
      <PlatformStats />
      <Stories items={stories} />
    </SiteShell>
  );
}
