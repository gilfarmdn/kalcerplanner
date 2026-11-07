import Image from "next/image";
import Link from "next/link";
import { Compass, MapPinned } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-black/20">
      <Image
        src="/images/hero.svg"
        alt=""
        fill
        priority
        unoptimized
        sizes="100vw"
        className="-z-10 object-cover opacity-80"
      />

      <div className="mx-auto flex min-h-[541px] max-w-[1440px] flex-col items-center justify-center px-4 py-12 text-center text-white">
        <h1 className="font-serif text-3xl font-bold leading-normal sm:text-[40px]">
          Jelajahi Warisan Nusantara,
          <br />
          Hidupkan Makna Sepanjang Masa 
        </h1>
        <p className="mt-3 font-serif text-base font-bold sm:text-xl">
          Rencanakan perjalanan bermakna, kenali tradisi lokal, dan temukan pengalaman autentik Indonesia.
        </p>

        <div className="mt-10 grid w-full max-w-[720px] grid-cols-1 gap-5 sm:grid-cols-2">
          <Link
            href="/rencana"
            className="flex flex-col items-center gap-3 rounded-[10px] border border-[rgba(248,168,31,0.8)] bg-[rgba(11,80,64,0.5)] px-6 py-8 backdrop-blur-[2px] transition hover:bg-[rgba(11,80,64,0.75)]"
          >
            <MapPinned size={40} />
            <span className="text-xl font-bold">Rencanakan Perjalanan</span>
          </Link>

          <Link
            href="/jelajah"
            className="flex flex-col items-center gap-3 rounded-[10px] border border-[rgba(248,168,31,0.8)] bg-[rgba(11,80,64,0.5)] px-6 py-8 backdrop-blur-[2px] transition hover:bg-[rgba(11,80,64,0.75)]"
          >
            <Compass size={40} />
            <span className="text-xl font-bold">Jelajahi Budaya</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
