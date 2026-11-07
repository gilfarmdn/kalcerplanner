import LiveClock from "@/components/LiveClock";

/** Judul halaman akun pengguna (dengan jam) dan isinya. Sidebar disediakan oleh UserShell. */
export default function DashboardShell({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-black pb-3">
        <h1 className="font-serif text-2xl font-bold sm:text-[32px]">{heading}</h1>
        <p className="text-sm sm:text-base">
          <LiveClock />
        </p>
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
