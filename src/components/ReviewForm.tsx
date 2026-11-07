"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";

export default function ReviewForm({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    if (!isLoggedIn) {
      router.push(`/masuk?next=${encodeURIComponent("/bantuan")}`);
      return;
    }
    if (rating < 1) {
      setMessage({ ok: false, text: "Pilih rating bintang terlebih dahulu." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, content }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.push(`/masuk?next=${encodeURIComponent("/bantuan")}`);
        return;
      }
      if (!res.ok) {
        setMessage({ ok: false, text: json.error ?? "Gagal mengirim ulasan." });
        return;
      }
      setMessage({ ok: true, text: "Terima kasih! Ulasanmu akan tampil setelah ditinjau." });
      setRating(0);
      setContent("");
    } catch {
      setMessage({ ok: false, text: "Tidak dapat terhubung ke server." });
    } finally {
      setLoading(false);
    }
  }

  const active = hover || rating;

  return (
    <form onSubmit={onSubmit} className="max-w-[684px]">
      <h1 className="font-serif text-3xl font-extrabold sm:text-[35px]">Berikan Ulasanmu</h1>

      <div className="mt-8 flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} bintang`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
          >
            <Star size={35} strokeWidth={1.5} className={n <= active ? "fill-yellow-400 text-black" : "text-black"} />
          </button>
        ))}
      </div>

      <textarea
        required
        minLength={10}
        maxLength={1000}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Tuliskan Ulasanmu......"
        className="mt-6 h-[225px] w-full resize-none rounded-[10px] border-2 border-black bg-white p-[18px] text-xl font-semibold outline-none placeholder:text-[#797272] focus:ring-2 focus:ring-brand-green"
      />

      <div className="mt-7 flex items-center justify-end gap-4">
        {message && (
          <p role="status" className={`text-sm ${message.ok ? "text-green-700" : "text-red-700"}`}>
            {message.text}
          </p>
        )}
        <button type="submit" disabled={loading} className="btn-primary h-[47px] w-[112px]">
          {loading ? "..." : "Submit"}
        </button>
      </div>
    </form>
  );
}
