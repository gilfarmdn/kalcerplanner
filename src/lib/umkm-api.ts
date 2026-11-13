import { guard } from "@/lib/api";
import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Hanya pelaku UMKM. Kurator memverifikasi produk, tidak mengubahnya. */
export const guardUmkm = () => guard(["UMKM"]);

/** Produk yang boleh dikelola user ini, atau null (tidak ada / bukan miliknya). */
export function findOwnedProduct(user: CurrentUser, id: string) {
  return prisma.umkmProduct.findFirst({ where: { id, ownerId: user.id } });
}
