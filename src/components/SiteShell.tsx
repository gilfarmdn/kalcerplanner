import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import UserShell from "@/components/UserShell";
import { getUser } from "@/lib/auth";

/**
 * Shared page chrome. Pengguna (wisatawan) yang masuk memakai kerangka sidebar tanpa navbar; pengunjung,
 * pelaku, dan kurator memakai navbar + footer. `publicChrome` memaksa navbar (mis. landing page).
 */
export default async function SiteShell({ children, publicChrome = false }: { children: React.ReactNode; publicChrome?: boolean }) {
  const user = await getUser();
  if (user?.role === "TRAVELER" && !publicChrome) return <UserShell user={user}>{children}</UserShell>;
  return (
    <>
      <Navbar user={user ? { name: user.name, role: user.role, avatarUrl: user.avatarUrl } : null} />
      <main>{children}</main>
      <Footer />
    </>
  );
}
