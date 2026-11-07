import ClockId from "@/components/pelaku/ClockId";

/** Judul halaman dasbor: "Selamat datang kembali, Nama" (atau judul biasa) + garis aksen + jam WIB. */
export default function PageHeading({ title, name }: { title: string; name?: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">
          {title}
          {name && (
            <>
              , <span className="text-brand-brown">{name}</span>
            </>
          )}
        </h1>
        <div className="mt-2 h-[3px] w-28 rounded bg-brand-orange" />
      </div>
      <p className="text-[11px] sm:text-xs">
        <ClockId />
      </p>
    </div>
  );
}
