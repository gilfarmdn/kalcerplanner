import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { SOURCE_NOTE, yogyakartaEvents, yogyakartaObjects } from "./data/yogyakarta";

const prisma = new PrismaClient();

async function seedCulture() {
  // Upsert by slug. `update` only refreshes the descriptive fields of objects that are still SEED,
  // so edits made by curators (status VERIFIED) are never overwritten.
  for (const o of yogyakartaObjects) {
    const data = {
      name: o.name,
      kind: o.kind,
      interest: o.interest,
      alsoInterests: o.alsoInterests ?? [],
      zone: o.zone,
      address: o.address ?? null,
      lat: o.lat,
      lng: o.lng,
      summary: o.summary,
      meaning: o.meaning,
      etiquette: o.etiquette,
      priceIdr: o.priceIdr,
      durationMin: o.durationMin,
      depth: o.depth,
      slots: o.slots,
      weekdays: o.weekdays ?? [],
      scheduleNote: o.scheduleNote ?? null,
      localRun: o.localRun ?? false,
      hiddenGem: o.hiddenGem ?? false,
      source: SOURCE_NOTE,
    };
    const existing = await prisma.culturalObject.findUnique({ where: { slug: o.slug }, select: { status: true } });
    if (!existing) {
      await prisma.culturalObject.create({ data: { slug: o.slug, status: "SEED", ...data } });
    } else if (existing.status === "SEED") {
      await prisma.culturalObject.update({ where: { slug: o.slug }, data });
    }
  }

  for (const e of yogyakartaEvents) {
    const exists = await prisma.culturalEvent.findUnique({ where: { slug: e.slug }, select: { id: true } });
    const startsOn = e.startsOn ? new Date(`${e.startsOn}T00:00:00.000Z`) : null;
    // Jadwal mingguan tanpa tanggal akhir berlaku terus (endsOn kosong); event lain default 1 hari.
    const endsOn = e.endsOn ? new Date(`${e.endsOn}T00:00:00.000Z`) : e.weekdays?.length ? null : startsOn;
    if (exists) {
      // Event yang sudah ada tidak ditimpa; hanya tanggal pasti dan lokasi yang diisi seed yang diperbarui.
      if (startsOn || e.venue) {
        await prisma.culturalEvent.update({
          where: { slug: e.slug },
          data: {
            ...(startsOn ? { startsOn, endsOn, repeatsYearly: e.repeatsYearly ?? false } : {}),
            ...(e.venue ? { venue: e.venue } : {}),
          },
        });
      }
      continue;
    }
    const obj = e.objectSlug
      ? await prisma.culturalObject.findUnique({ where: { slug: e.objectSlug }, select: { id: true } })
      : null;
    await prisma.culturalEvent.create({
      data: {
        slug: e.slug,
        title: e.title,
        description: e.description,
        interest: e.interest ?? null,
        zone: e.zone ?? null,
        objectId: obj?.id ?? null,
        monthHint: e.monthHint ?? null,
        dateNote: e.dateNote,
        startsOn,
        endsOn,
        repeatsYearly: e.repeatsYearly ?? false,
        weekdays: e.weekdays ?? [],
        openTime: e.openTime ?? null,
        closeTime: e.closeTime ?? null,
        venue: e.venue ?? null,
      },
    });
  }
}

/** Optional: create an ADMIN (curator) account from env vars so the first deployment can verify data. */
async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  if (password.length < 8) {
    console.warn("ADMIN_PASSWORD must be at least 8 characters — admin not created.");
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    // Akun kurator dianggap sudah terverifikasi (dibuat oleh pengelola, bukan pendaftaran mandiri).
    await prisma.user.updateMany({ where: { email, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
    await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
    return;
  }
  await prisma.user.create({
    data: {
      name: "Kurator KalcerPlanner",
      email,
      passwordHash: await hashPassword(password),
      role: "ADMIN",
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`Admin account created for ${email}`);
}

async function main() {
  // Data sampel Yogyakarta hanya untuk pengembangan / demo. Produksi tidak memakainya, jadi default-nya mati:
  // set SEED_SAMPLE_DATA=true untuk menyalakannya. Akun kurator (ADMIN_EMAIL) tetap dibuat apa pun nilainya.
  if (process.env.SEED_SAMPLE_DATA === "true") {
    await seedCulture();
  } else {
    console.log("Data sampel dilewati (SEED_SAMPLE_DATA bukan true).");
  }
  await seedAdmin();
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
