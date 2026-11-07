import Image from "next/image";
import Link from "next/link";
import { Instagram, MessageCircle, Send } from "lucide-react";
import { navLinks } from "@/lib/content";
import NewsletterForm from "./NewsletterForm";

const socials = [
  { label: "WhatsApp", href: "https://wa.me/", icon: MessageCircle, color: "bg-[#25d366]" },
  { label: "Instagram", href: "https://instagram.com/", icon: Instagram, color: "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600" },
  { label: "Telegram", href: "https://t.me/", icon: Send, color: "bg-[#2aabee]" },
];

const accountLinks = [
  { href: "/trip", label: "My Trip" },
  { href: "/jejak", label: "Paspor Budaya" },
  { href: "/kunjungan", label: "Daftar Kunjungan" },
  { href: "/profil", label: "Profil" },
];

const linkGroups = [
  { title: "Jelajahi", links: navLinks.filter((l) => l.href !== "/") },
  { title: "Akun Kamu", links: accountLinks },
];

export default function Footer() {
  return (
    <footer className="border-t-4 border-brand-orange bg-brand-cream text-brand-green">
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-x-6 gap-y-10 px-6 py-12 md:px-12 lg:grid-cols-[1.5fr_1fr_1fr_1.3fr] lg:gap-12 lg:px-[134px]">
        <div className="col-span-2 lg:col-span-1">
          <Link href="/" aria-label="KalcerPlanner beranda" className="inline-block">
            <Image src="/images/logo/logo-trim.png" alt="KalcerPlanner" width={527} height={480} unoptimized className="h-28 w-auto" />
          </Link>
          <p className="mt-4 max-w-[300px] text-sm leading-relaxed text-brand-green/80">
            Itinerary budaya yang menjelaskan maknanya, menopang pelaku lokal, dan menyebar kunjungan.
          </p>
          <h3 className="mt-6 text-base font-semibold">Kontak</h3>
          <div className="mt-3 flex gap-2">
            {socials.map(({ label, href, icon: Icon, color }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-white transition hover:brightness-110 ${color}`}
              >
                <Icon size={20} />
              </a>
            ))}
          </div>
        </div>

        {linkGroups.map(({ title, links }) => (
          <nav key={title} aria-label={title}>
            <h3 className="text-base font-semibold">{title}</h3>
            <ul className="mt-4 space-y-3 text-sm text-brand-green/80">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-brand-brown">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="col-span-2 lg:col-span-1">
          <h3 className="text-base font-semibold">Stay to Update</h3>
          <p className="mb-4 mt-4 text-sm leading-relaxed text-brand-green/80">
            Dapatkan kabar terbaru seputar perjalanan budaya Indonesia lewat email.
          </p>
          <NewsletterForm />
        </div>
      </div>

      <div className="bg-brand-green">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-1 px-6 py-5 text-sm text-white/90 sm:flex-row sm:items-center sm:justify-between md:px-12 lg:px-[134px]">
          <p>Copyright {new Date().getFullYear()} - KalcerPlanner.id</p>
          <p>Rencanakan perjalanan budaya yang bermakna</p>
        </div>
      </div>
    </footer>
  );
}
