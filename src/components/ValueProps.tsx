import { BookOpenText, CalendarDays, HandHeart, Sparkles, Stamp } from "lucide-react";

const items = [
  {
    icon: Sparkles,
    title: "Rekomendasi Perjalanan",
    text: "Temukan destinasi budaya yang sesuai dengan minatmu, lengkap dengan pengalaman unik yang layak dijelajahi.",
  },
  {
    icon: BookOpenText,
    title: "Cerita di Balik Budaya",
    text: "Kenali sejarah, filosofi, dan tradisi lokal agar setiap kunjungan punya cerita dan makna.",
  },
  {
    icon: HandHeart,
    title: "Dukung Karya Lokal",
    text: "Nikmati pengalaman budaya sekaligus berkontribusi pada keberlangsungan tradisi dan penghidupan masyarakat setempat.",
  },
  {
    icon: CalendarDays,
    title: "Agenda Budaya Nusantara",
    text: "Temukan upacara adat, festival, dan pertunjukan budaya pada waktu yang tepat untuk dikunjungi.",
  },
  {
    icon: Stamp,
    title: "Paspor Budaya",
    text: "Abadikan setiap perjalanan melalui koleksi stempel digital dan cerita budaya yang kamu temukan.",
  },
];

export default function ValueProps() {
  return (
    <section id="keunggulan" className="mx-auto max-w-[1440px] px-4 pb-6 pt-14 sm:px-8 lg:px-[66px]">
      <h2 className="section-title">Lebih dari Sekadar Itinerary</h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-neutral-700">
        KalcerPlanner membantu wisatawan memahami budaya yang mereka kunjungi, dan membantu pelaku budaya mendapat manfaatnya.
      </p>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {items.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-[10px] bg-brand-mist/30 p-5">
            <Icon size={32} aria-hidden className="text-brand-green" />
            <h3 className="mt-3 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
