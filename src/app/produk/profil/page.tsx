import type { Metadata } from "next";
import PageHeading from "@/components/pelaku/PageHeading";
import ProfileForm from "@/components/ProfileForm";
import { requireUmkm } from "@/lib/auth";

export const metadata: Metadata = { title: "Profil — KalcerPlanner" };
export const dynamic = "force-dynamic";

export default async function UmkmProfilPage() {
  const user = await requireUmkm("/produk/profil");
  return (
    <>
      <PageHeading title="Profil" />
      <div className="max-w-xl">
        <ProfileForm name={user.name} email={user.email} roleLabel="Pelaku UMKM" avatarUrl={user.avatarUrl} />
      </div>
    </>
  );
}
