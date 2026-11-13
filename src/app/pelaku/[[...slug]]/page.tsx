import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { roleHome } from "@/lib/role-home";

export const dynamic = "force-dynamic";

/** Alamat lama /pelaku/* (bookmark, tautan lama) dialihkan ke alamat baru /destinasi/* dan /admin/*. */
export default async function OldPelakuRedirect({ params, searchParams }: { params: { slug?: string[] }; searchParams: Record<string, string | string[] | undefined> }) {
  const [section, id] = params.slug ?? [];
  const query = new URLSearchParams(
    Object.entries(searchParams).flatMap(([k, v]) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]).map((x) => [k, x]))),
  ).toString();
  const withQuery = (path: string) => (query ? `${path}?${query}` : path);

  if (section === "kurasi") redirect("/admin");
  if (section === "akun") redirect(withQuery("/admin/akun"));
  if (section === "tambah") redirect("/destinasi/tambah");
  if (section === "kunjungan") redirect(withQuery("/destinasi/kunjungan"));
  if (section === "destinasi" && id) redirect(`/destinasi/${encodeURIComponent(id)}`);

  const user = await getUser();
  if (!user) redirect("/masuk");
  if (section === "profil") redirect(user.role === "ADMIN" ? "/admin/profil" : user.role === "PRACTITIONER" ? "/destinasi/profil" : user.role === "UMKM" ? "/produk/profil" : "/profil");
  redirect(roleHome(user.role));
}
