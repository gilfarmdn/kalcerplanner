export type Role = "TRAVELER" | "PRACTITIONER" | "UMKM" | "ADMIN";

/** Halaman utama tiap jenis akun. Setiap login selalu berakhir di sini. */
export function roleHome(role: Role): string {
  if (role === "ADMIN") return "/admin";
  if (role === "PRACTITIONER") return "/destinasi";
  if (role === "UMKM") return "/produk";
  return "/trip";
}
