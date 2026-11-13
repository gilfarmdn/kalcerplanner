import type { Metadata } from "next";
import Link from "next/link";
import AccountActions from "@/components/pelaku/AccountActions";
import PageHeading from "@/components/pelaku/PageHeading";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRentang } from "@/lib/tanggal";

export const metadata: Metadata = { title: "Kelola Akun — KalcerPlanner" };
export const dynamic = "force-dynamic";

const ROLES = { PRACTITIONER: "Pelaku budaya", UMKM: "Pelaku UMKM", TRAVELER: "Pengguna" } as const;
type ManagedRole = keyof typeof ROLES;

const tanggal = (d: Date) => formatRentang(d, d);

export default async function AkunPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  await requireRole("ADMIN", "/admin/akun");

  const role: ManagedRole = searchParams.peran === "TRAVELER" || searchParams.peran === "UMKM" ? searchParams.peran : "PRACTITIONER";
  const status = searchParams.status === "nonaktif" || searchParams.status === "aktif" ? searchParams.status : "";
  const q = (searchParams.q ?? "").trim().slice(0, 80);

  const accounts = await prisma.user.findMany({
    where: {
      role,
      ...(status === "nonaktif" ? { deactivatedAt: { not: null } } : status === "aktif" ? { deactivatedAt: null } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      emailVerifiedAt: true,
      deactivatedAt: true,
      _count: { select: { objects: true, umkmProducts: true, trips: true, visits: true } },
    },
  });

  const tabHref = (r: ManagedRole) => {
    const qs = new URLSearchParams({ peran: r });
    if (status) qs.set("status", status);
    if (q) qs.set("q", q);
    return `/admin/akun?${qs.toString()}`;
  };

  return (
    <>
      <PageHeading title="Kelola Akun" />
      <p className="mb-4 max-w-2xl text-sm text-neutral-700">
        Akun yang dinonaktifkan tidak bisa masuk. Hapus permanen hanya tersedia untuk akun yang sudah nonaktif.
      </p>

      <div className="mb-4 flex gap-2">
        {(Object.keys(ROLES) as ManagedRole[]).map((r) => (
          <Link
            key={r}
            href={tabHref(r)}
            aria-current={r === role ? "page" : undefined}
            className={`rounded-md px-4 py-2 text-sm font-semibold ${r === role ? "bg-brand-green text-white" : "border border-neutral-300 hover:bg-neutral-100"}`}
          >
            {ROLES[r]}
          </Link>
        ))}
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="peran" value={role} />
        <label className="text-xs font-medium">
          Cari nama / email
          <input name="q" defaultValue={q} className="mt-1 block rounded-lg border border-[#2c2c2c] px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs font-medium">
          Status
          <select name="status" defaultValue={status} className="select-arrow mt-1 block rounded-lg border border-[#2c2c2c] px-2 py-1.5 text-sm">
            <option value="">Semua</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
        </label>
        <button type="submit" className="h-9 rounded-lg bg-brand-green px-4 text-sm font-medium text-white">
          Terapkan
        </button>
      </form>

      {accounts.length === 0 ? (
        <p className="text-neutral-700">Tidak ada akun yang cocok.</p>
      ) : (
        <ul className="max-w-4xl space-y-3">
          {accounts.map((a) => (
            <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 rounded-[10px] border border-neutral-400 bg-white p-4">
              <div className="min-w-0">
                <p className="font-semibold">
                  {a.name}{" "}
                  {a.deactivatedAt ? (
                    <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-900">Nonaktif</span>
                  ) : (
                    <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-900">Aktif</span>
                  )}
                </p>
                <p className="truncate text-sm text-neutral-700">{a.email}</p>
                <p className="mt-1 text-xs text-neutral-600">
                  Terdaftar {tanggal(a.createdAt)} · {a.emailVerifiedAt ? "email terverifikasi" : "email belum diverifikasi"} ·{" "}
                  {role === "PRACTITIONER"
                    ? `${a._count.objects} destinasi/event`
                    : role === "UMKM"
                      ? `${a._count.umkmProducts} produk`
                      : `${a._count.trips} rencana · ${a._count.visits} pendaftaran`}
                  {a.deactivatedAt && ` · dinonaktifkan ${tanggal(a.deactivatedAt)}`}
                </p>
              </div>
              <AccountActions id={a.id} name={a.name} deactivated={!!a.deactivatedAt} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
