"use client";

import { FormEvent, useState } from "react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setState(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (res.ok) {
        setState({ ok: true, message: "Terima kasih sudah berlangganan!" });
        setEmail("");
      } else {
        setState({ ok: false, message: json.error ?? "Gagal berlangganan." });
      }
    } catch {
      setState({ ok: false, message: "Tidak dapat terhubung ke server." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-[260px]">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email Kamu"
        aria-label="Email"
        className="h-9 w-full rounded-[10px] border border-brand-green/30 bg-white px-4 text-[15px] text-black outline-none placeholder:text-black/50 focus:ring-2 focus:ring-brand-orange"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="h-9 rounded-[10px] bg-brand-green px-[15px] text-[15px] text-white hover:brightness-110 disabled:opacity-60"
        >
          {loading ? "..." : "Subscribe"}
        </button>
      </div>
      {state && (
        <p role="status" className={`mt-1 text-xs ${state.ok ? "text-brand-green" : "text-red-700"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
