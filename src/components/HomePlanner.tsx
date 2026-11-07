"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Counter from "@/components/ui/Counter";

const fieldClass =
  "h-7 w-full rounded-[5px] border border-[rgba(248,168,31,0.8)] bg-transparent px-2 text-[10px] text-white outline-none placeholder:text-white/70 focus:ring-1 focus:ring-yellow-200 [color-scheme:dark]";

/**
 * "RENCANA" box in the hero. Clicking "Buat Rencana Otomatis" always leads to the login page
 * for visitors who are not signed in (they return to /rencana afterwards with the form prefilled).
 */
export default function HomePlanner({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [pergi, setPergi] = useState("");
  const [pulang, setPulang] = useState("");
  const [anggaran, setAnggaran] = useState("");
  const [anak, setAnak] = useState(0);
  const [dewasa, setDewasa] = useState(1);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (pergi) params.set("pergi", pergi);
    if (pulang) params.set("pulang", pulang);
    const budget = anggaran.replace(/\D/g, "");
    if (budget) params.set("anggaran", budget);
    params.set("dewasa", String(dewasa));
    params.set("anak", String(anak));

    const target = `/rencana?${params.toString()}`;
    router.push(isLoggedIn ? target : `/masuk?next=${encodeURIComponent(target)}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto w-full max-w-[405px] rounded-[10px] border border-[rgba(248,168,31,0.8)] bg-[rgba(11,80,64,0.5)] px-7 pb-5 pt-4 text-left text-white backdrop-blur-[2px]"
    >
      <h2 className="mb-3 text-center text-xl font-bold">RENCANA</h2>

      <div className="grid grid-cols-2 gap-x-5 gap-y-2">
        <div>
          <p className="mb-1 text-center text-[10px]">Tanggal Perjalanan</p>
          <div className="grid grid-cols-2 gap-1">
            <label className="text-center text-[8px]">
              Pergi
              <input
                type="date"
                required
                min={today}
                value={pergi}
                onChange={(e) => setPergi(e.target.value)}
                className={`${fieldClass} mt-0.5 px-1 text-center`}
              />
            </label>
            <label className="text-center text-[8px]">
              Pulang
              <input
                type="date"
                required
                min={pergi || today}
                value={pulang}
                onChange={(e) => setPulang(e.target.value)}
                className={`${fieldClass} mt-0.5 px-1 text-center`}
              />
            </label>
          </div>
        </div>

        <div>
          <p className="mb-1 text-center text-[10px]">Jumlah Wisatawan</p>
          <div className="grid grid-cols-2 gap-1">
            <div className="text-center text-[8px]">
              Anak
              <div className="mt-0.5">
                <Counter variant="compact" label="Anak" value={anak} min={0} onChange={setAnak} />
              </div>
            </div>
            <div className="text-center text-[8px]">
              Dewasa
              <div className="mt-0.5">
                <Counter variant="compact" label="Dewasa" value={dewasa} min={1} onChange={setDewasa} />
              </div>
            </div>
          </div>
        </div>

        <label className="text-[8px]">
          Lokasi Tujuan
          <input readOnly value="Seluruh Indonesia" aria-label="Lokasi tujuan" className={`${fieldClass} mt-1 text-[10px]`} />
        </label>
        <label className="text-[8px]">
          Anggaran Perjalanan
          <input
            inputMode="numeric"
            value={anggaran}
            onChange={(e) => setAnggaran(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="6000000"
            className={`${fieldClass} mt-1 text-[10px]`}
          />
        </label>
      </div>

      <div className="mt-4 flex justify-center">
        <button
          type="submit"
          className="h-7 w-[142px] rounded-[10px] bg-brand-orange font-serif text-[10px] font-bold text-white transition hover:brightness-110"
        >
          Buat Rencana Otomatis
        </button>
      </div>
    </form>
  );
}
