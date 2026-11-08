// Kuota pendaftaran kunjungan per tanggal. Sisa kuota selalu dihitung dari data kunjungan (bukan penghitung
// terpisah), sehingga tetap akurat walaupun pengelola mengubah atau menandai kunjungan.

import { Prisma } from "@prisma/client";
import { eventOccursOn, weekdayOf } from "@/lib/kalender";
import { sendMail } from "@/lib/mailer";
import { dayString, toDay, formatHariPanjang, hariIniJakarta } from "@/lib/tanggal";
import { prisma } from "@/lib/prisma";

/** Kunjungan yang memakai kuota. */
export const ACTIVE_VISIT = ["BOOKED", "ATTENDED"] as const;

/** Pembatalan oleh pengguna paling lambat H-1. */
export const canCancel = (visitDate: string) => visitDate > hariIniJakarta();

type ScheduleRow = {
  id: string;
  startsOn: Date | null;
  endsOn: Date | null;
  repeatsYearly: boolean;
  weekdays: number[];
  exceptDates: string[];
};

export const toSchedule = (e: ScheduleRow) => ({
  startsOn: e.startsOn ? dayString(e.startsOn) : null,
  endsOn: e.endsOn ? dayString(e.endsOn) : null,
  repeatsYearly: e.repeatsYearly,
  weekdays: e.weekdays,
  exceptDates: e.exceptDates,
});

/**
 * Apakah tempat bisa dikunjungi pada tanggal itu? Event: salah satu jadwal event aktifnya berlangsung
 * (mengembalikan event tersebut). Destinasi biasa: hari buka (kosong = setiap hari).
 */
export function openOn(
  o: { isEvent: boolean; weekdays: number[]; events: ScheduleRow[] },
  date: string,
): { open: boolean; eventId: string | null } {
  if (o.isEvent) {
    const ev = o.events.find((e) => eventOccursOn(toSchedule(e), date));
    return { open: !!ev, eventId: ev?.id ?? null };
  }
  return { open: o.weekdays.length === 0 || o.weekdays.includes(weekdayOf(date)), eventId: null };
}

export async function filledOn(objectId: string, date: string, db: Prisma.TransactionClient = prisma): Promise<number> {
  const agg = await db.visit.aggregate({
    _sum: { partySize: true },
    where: { objectId, visitDate: toDay(date), status: { in: [...ACTIVE_VISIT] } },
  });
  return agg._sum.partySize ?? 0;
}

export class KuotaError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/**
 * Daftarkan kunjungan secara atomik. Baris objek dikunci (SELECT ... FOR UPDATE) selama transaksi, jadi
 * pendaftaran bersamaan ke tempat yang sama dilayani bergiliran dan kuota tidak bisa terlampaui.
 */
export async function registerVisit(input: {
  user: { id: string; name: string; email: string };
  objectId: string;
  date: string;
  partySize: number;
  eventId: string | null;
  contact?: string;
  note?: string;
}) {
  const { user, objectId, date, partySize } = input;
  const visitDate = toDay(date);
  try {
    return await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ dailyQuota: number | null }[]>`
        SELECT "dailyQuota" FROM "CulturalObject" WHERE id = ${objectId} FOR UPDATE`;
      const quota = locked[0]?.dailyQuota ?? null;
      if (quota === null) throw new KuotaError("Tempat ini tidak memerlukan pendaftaran");

      const existing = await tx.visit.findUnique({
        where: { userId_objectId_visitDate: { userId: user.id, objectId, visitDate } },
        select: { id: true, status: true },
      });
      if (existing && existing.status !== "CANCELLED") throw new KuotaError("Kamu sudah terdaftar di tempat ini pada tanggal tersebut", 409);

      const filled = await filledOn(objectId, date, tx);
      if (filled + partySize > quota) {
        const left = Math.max(0, quota - filled);
        throw new KuotaError(left === 0 ? "Kuota pada tanggal ini sudah penuh" : `Kuota tidak cukup. Sisa ${left} slot`, 409);
      }

      const data = {
        eventId: input.eventId,
        visitorName: user.name,
        contact: input.contact ?? user.email,
        partySize,
        status: "BOOKED" as const,
        source: "ONLINE" as const,
        note: input.note ?? null,
        changeNotice: null,
        changedAt: null,
      };
      return existing
        ? tx.visit.update({ where: { id: existing.id }, data, select: { id: true } })
        : tx.visit.create({ data: { ...data, objectId, userId: user.id, visitDate }, select: { id: true } });
    });
  } catch (error) {
    // Dua permintaan dari pengguna yang sama pada saat bersamaan: yang kedua ditolak oleh indeks unik.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new KuotaError("Kamu sudah terdaftar di tempat ini pada tanggal tersebut", 409);
    }
    throw error;
  }
}

type NoticeTarget = {
  id: string;
  visitDate: Date;
  partySize: number;
  user: { name: string; email: string } | null;
  object: { name: string; slug: string };
};

/**
 * Tandai kunjungan terdaftar yang terdampak perubahan dari pengelola, lalu kabari penggunanya lewat email.
 * `cancel` = kunjungan dibatalkan (kuota kembali); selain itu hanya diberi catatan.
 */
export async function noticeVisits(visits: NoticeTarget[], notice: string, cancel: boolean) {
  if (visits.length === 0) return;
  await prisma.visit.updateMany({
    where: { id: { in: visits.map((v) => v.id) } },
    data: { changeNotice: notice, changedAt: new Date(), ...(cancel ? { status: "CANCELLED" } : {}) },
  });
  await Promise.all(
    visits
      .filter((v) => v.user)
      .map((v) => {
        const tgl = formatHariPanjang(v.visitDate);
        const text =
          `Halo ${v.user!.name},\n\n` +
          `Ada perubahan untuk kunjunganmu ke ${v.object.name} pada ${tgl} (${v.partySize} orang):\n\n` +
          `${notice}\n\n` +
          (cancel ? "Pendaftaranmu dibatalkan dan kuota dikembalikan.\n\n" : "Pendaftaranmu tetap berlaku.\n\n") +
          "Salam,\nKalcerPlanner";
        return sendMail({
          to: v.user!.email,
          subject: `Perubahan kunjungan: ${v.object.name}`,
          text,
          html: text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>"),
        }).catch((error) => console.error("[kuota] email gagal", error));
      }),
  );
}

/** Kunjungan terdaftar (belum lewat) yang cocok dengan filter, beserta data untuk email. */
export function upcomingVisits(where: Prisma.VisitWhereInput) {
  return prisma.visit.findMany({
    where: { ...where, status: "BOOKED", visitDate: { gte: toDay(hariIniJakarta()) } },
    select: {
      id: true,
      visitDate: true,
      partySize: true,
      user: { select: { name: true, email: true } },
      object: { select: { name: true, slug: true } },
    },
  });
}
