import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import SessionKeeper from "@/components/SessionKeeper";
import { getSession } from "@/lib/auth";

// File font (subset Latin, lisensi OFL) disimpan di ./fonts agar build tidak bergantung pada Google Fonts.
const playfair = localFont({
  src: "./fonts/playfair-display-latin-wght.woff2",
  weight: "400 900",
  variable: "--font-playfair",
  display: "swap",
});

const poppins = localFont({
  // next/font hanya menerima nilai literal, jadi tiap file ditulis satu per satu.
  src: [
    { path: "./fonts/poppins-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/poppins-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/poppins-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/poppins-latin-500-italic.woff2", weight: "500", style: "italic" },
    { path: "./fonts/poppins-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/poppins-latin-600-italic.woff2", weight: "600", style: "italic" },
    { path: "./fonts/poppins-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/poppins-latin-700-italic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

const inter = localFont({
  src: "./fonts/inter-latin-wght.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KalcerPlanner — Rencanakan Perjalanan Budaya Indonesia",
  description:
    "Itinerary budaya yang menjelaskan maknanya, menopang pelaku lokal, dan menyebar kunjungan",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "KalcerPlanner",
    description: "Rencanakan perjalanan budaya yang bermakna",
    locale: "id_ID",
    type: "website",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="id" className={`${playfair.variable} ${poppins.variable} ${inter.variable}`} data-kp-check={session ? "pending" : undefined}>
      <body>
        {children}
        <SessionKeeper loggedIn={!!session} />
      </body>
    </html>
  );
}
