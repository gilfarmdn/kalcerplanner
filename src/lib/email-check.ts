import { promises as dns } from "dns";
import { prisma } from "@/lib/prisma";

/** true = alamat boleh dikirimi email. */
export async function canSendTo(email: string): Promise<boolean> {
  if (await prisma.emailBounce.findUnique({ where: { email }, select: { email: true } })) return false;
  const domain = email.slice(email.lastIndexOf("@") + 1);
  try {
    const mx = await dns.resolveMx(domain);
    return mx.length > 0;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    return !(code === "ENOTFOUND" || code === "ENODATA"); // gangguan DNS sementara tidak memblokir
  }
}
