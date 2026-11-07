import type { Metadata } from "next";
import PageHeading from "@/components/pelaku/PageHeading";
import ProfileForm from "@/components/ProfileForm";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Profil — KalcerPlanner" };
export const dynamic = "force-dynamic";

export default async function AdminProfilPage() {
  const user = await requireRole("ADMIN", "/admin/profil");
  return (
    <>
      <PageHeading title="Profil" />
      <div className="max-w-xl">
        <ProfileForm name={user.name} email={user.email} roleLabel="Kurator" avatarUrl={user.avatarUrl} />
      </div>
    </>
  );
}
