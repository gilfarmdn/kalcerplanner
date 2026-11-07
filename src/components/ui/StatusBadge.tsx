const styles: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Menunggu verifikasi", cls: "bg-amber-100 text-amber-900" },
  VERIFIED: { label: "Terverifikasi kurator", cls: "bg-emerald-100 text-emerald-900" },
  REJECTED: { label: "Ditolak", cls: "bg-red-100 text-red-900" },
  HIDDEN: { label: "Disembunyikan", cls: "bg-neutral-200 text-neutral-800" },
};

/** Verification status of a cultural object, shown wherever its data appears. */
export default function StatusBadge({ status }: { status: string }) {
  // Data awal tim (SEED) tampil tanpa label status.
  if (status === "SEED") return null;
  const s = styles[status] ?? styles.PENDING;
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}
