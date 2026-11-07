import type { Metadata } from "next";
import Faq from "@/components/Faq";
import ReviewForm from "@/components/ReviewForm";
import SiteShell from "@/components/SiteShell";
import { getSession } from "@/lib/auth";
import { faqs } from "@/lib/content";

export const metadata: Metadata = { title: "Bantuan — KalcerPlanner" };
export const dynamic = "force-dynamic";

export default async function BantuanPage() {
  const session = await getSession();

  return (
    <SiteShell>
      <div className="mx-auto max-w-[1440px] space-y-16 px-4 pb-24 pt-12 sm:px-8 lg:px-[134px]">
        <ReviewForm isLoggedIn={!!session} />
        <Faq items={faqs} />
      </div>
    </SiteShell>
  );
}
