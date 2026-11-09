export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { prisma } = await import("@/lib/prisma");

  const cleanup = async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const { count } = await prisma.user.deleteMany({
        where: { emailVerifiedAt: null, createdAt: { lt: cutoff } },
      });
      if (count) console.log(`[cleanup] ${count} akun belum terverifikasi >24 jam dihapus`);
      await prisma.authToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    } catch (e) {
      console.error("[cleanup] gagal", e);
    }
  };

  void cleanup();
  setInterval(cleanup, 60 * 60 * 1000).unref(); // tiap jam
}
