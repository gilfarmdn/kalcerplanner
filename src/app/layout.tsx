import type { Metadata } from "next";
import { Inter, Playfair_Display, Poppins } from "next/font/google";
import "./globals.css";
import SessionKeeper from "@/components/SessionKeeper";
import { getSession } from "@/lib/auth";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-playfair",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-poppins",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
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
