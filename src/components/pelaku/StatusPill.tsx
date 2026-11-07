const styles: Record<string, { label: string; cls: string }> = {
  SEED: { label: "Tampil publik", cls: "bg-emerald-100 text-emerald-900" },
  PENDING: { label: "Menunggu verifikasi", cls: "bg-amber-100 text-amber-900" },
  VERIFIED: { label: "Terverifikasi", cls: "bg-emerald-100 text-emerald-900" },
  REJECTED: { label: "Ditolak", cls: "bg-red-100 text-red-900" },
  HIDDEN: { label: "Disembunyikan", cls: "bg-neutral-200 text-neutral-800" },
};

export default function StatusPill({ status }: { status: string }) {
  const s = styles[status] ?? styles.PENDING;
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${s.cls}`}>{s.label}</span>;
}
