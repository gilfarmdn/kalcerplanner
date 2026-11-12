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

/** Destinasi bisa dikunjungi pada tanggal itu bila termasuk hari buka (kosong = setiap hari). */
export const objectOpenOn = (o: { weekdays: number[] }, date: string): boolean =>
  o.weekdays.length === 0 || o.weekdays.includes(weekdayOf(date));

/** Event mandiri berlangsung pada tanggal itu bila tanggalnya termasuk jadwal event. */
export const eventOpenOn = (e: ScheduleRow, date: string): boolean => eventOccursOn(toSchedule(e), date);

/**
 * Tujuan pendaftaran: destinasi (`objectId`, boleh dengan `eventId` yang menandai kegiatan di destinasi itu)
 * atau event mandiri (hanya `eventId`). Kuota dihitung per tujuan.
 */
export type VisitTarget = { objectId: string; eventId?: string | null } | { objectId?: null; eventId: string };

const targetWhere = (t: VisitTarget) => (t.objectId ? { objectId: t.objectId } : { eventId: t.eventId! });

export async function filledOn(target: VisitTarget, date: string, db: Prisma.TransactionClient = prisma): Promise<number> {
  const agg = await db.visit.aggregate({
    _sum: { partySize: true },
    where: { ...targetWhere(target), visitDate: toDay(date), status: { in: [...ACTIVE_VISIT] } },
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
  target: VisitTarget;
  date: string;
  partySize: number;
  contact?: string;
  note?: string;
}) {
  const { user, target, date, partySize } = input;
  const visitDate = toDay(date);
  try {
    return await prisma.$transaction(async (tx) => {
      // Baris tujuan dikunci supaya pendaftaran bersamaan dilayani bergiliran.
      const locked = target.objectId
        ? await tx.$queryRaw<{ dailyQuota: number | null }[]>`
            SELECT "dailyQuota" FROM "CulturalObject" WHERE id = ${target.objectId} FOR UPDATE`
        : await tx.$queryRaw<{ dailyQuota: number | null }[]>`
            SELECT "dailyQuota" FROM "CulturalEvent" WHERE id = ${target.eventId} FOR UPDATE`;
      const quota = locked[0]?.dailyQuota ?? null;
      if (quota === null) throw new KuotaError("Tempat ini tidak memerlukan pendaftaran");

      const existing = target.objectId
        ? await tx.visit.findUnique({
            where: { userId_objectId_visitDate: { userId: user.id, objectId: target.objectId, visitDate } },
            select: { id: true, status: true },
          })
        : await tx.visit.findUnique({
            where: { userId_eventId_visitDate: { userId: user.id, eventId: target.eventId!, visitDate } },
            select: { id: true, status: true },
          });
      if (existing && existing.status !== "CANCELLED") throw new KuotaError("Kamu sudah terdaftar di tempat ini pada tanggal tersebut", 409);

      const filled = await filledOn(target, date, tx);
      if (filled + partySize > quota) {
        const left = Math.max(0, quota - filled);
        throw new KuotaError(left === 0 ? "Kuota pada tanggal ini sudah penuh" : `Kuota tidak cukup. Sisa ${left} slot`, 409);
      }

      const data = {
        eventId: target.eventId ?? null,
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
        : tx.visit.create({ data: { ...data, objectId: target.objectId ?? null, userId: user.id, visitDate }, select: { id: true } });
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
  object: { name: string; slug: string } | null;
  event: { title: string; slug: string } | null;
};

const placeName = (v: NoticeTarget) => v.object?.name ?? v.event?.title ?? "tempat ini";

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
          `Ada perubahan untuk kunjunganmu ke ${placeName(v)} pada ${tgl} (${v.partySize} orang):\n\n` +
          `${notice}\n\n` +
          (cancel ? "Pendaftaranmu dibatalkan dan kuota dikembalikan.\n\n" : "Pendaftaranmu tetap berlaku.\n\n") +
          "Salam,\nKalcerPlanner";
        return sendMail({
          to: v.user!.email,
          subject: `Perubahan kunjungan: ${placeName(v)}`,
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
      event: { select: { title: true, slug: true } },
    },
  });
}
