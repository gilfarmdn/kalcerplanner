import type { Metadata } from "next";
import PageHeading from "@/components/pelaku/PageHeading";
import ProfileForm from "@/components/ProfileForm";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Profil — KalcerPlanner" };
export const dynamic = "force-dynamic";

export default async function PelakuProfilPage() {
  const user = await requireUser("/pelaku/profil");
  return (
    <>
      <PageHeading title="Profil" />
      <div className="max-w-xl">
        <ProfileForm name={user.name} email={user.email} roleLabel={user.role === "ADMIN" ? "Kurator" : "Pelaku budaya"} avatarUrl={user.avatarUrl} />
      </div>
    </>
  );
}
