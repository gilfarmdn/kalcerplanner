import type { Metadata } from "next";
import DashboardShell from "@/components/DashboardShell";
import ProfileForm from "@/components/ProfileForm";
import SiteShell from "@/components/SiteShell";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Profil — KalcerPlanner" };
export const dynamic = "force-dynamic";

const roleLabels = { TRAVELER: "Wisatawan", PRACTITIONER: "Pelaku budaya", ADMIN: "Kurator" } as const;

export default async function ProfilPage() {
  const user = await requireUser("/profil");
  return (
    <SiteShell>
      <DashboardShell heading={`Informasi Profilmu, ${user.name.split(" ")[0]}`}>
        <ProfileForm name={user.name} email={user.email} roleLabel={roleLabels[user.role]} avatarUrl={user.avatarUrl} />
      </DashboardShell>
    </SiteShell>
  );
}
