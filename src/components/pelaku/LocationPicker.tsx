"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";

export type LatLng = { lat: number; lng: number };

// Pusat awal peta: seluruh Indonesia. Lokasi boleh di mana saja.
const START: LatLng = { lat: -2.5, lng: 118 };
const round = (n: number) => Math.round(n * 1e6) / 1e6;

const PIN_HTML =
  '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:#d62828;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5);transform:rotate(-45deg)"></div>';

/** Mengambil dua angka (lintang, bujur) dari teks yang ditempel, mis. "-7.8053, 110.3642" dari Google Maps. */
function parseCoords(text: string): LatLng | null {
  const m = text.match(/(-?\d{1,2}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{2,3}(?:[.,]\d+)?)/);
  if (!m) return null;
  const lat = Number(m[1].replace(",", "."));
  const lng = Number(m[2].replace(",", "."));
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat: round(lat), lng: round(lng) } : null;
}

/**
 * Pemilih lokasi: klik peta atau seret penanda. Peta memakai OpenStreetMap lewat Leaflet (tanpa kunci API).
 * Satu nilai {lat, lng} menggantikan dua kolom koordinat.
 */
export default function LocationPicker({ value, onChange }: { value: LatLng | null; onChange: (p: LatLng) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const setPointRef = useRef<((p: LatLng, zoom?: number) => void) | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const initial = useRef(value);
  const [paste, setPaste] = useState("");
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: { remove: () => void } | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !box.current) return;

      const start = initial.current ?? START;
      const m = L.map(box.current).setView([start.lat, start.lng], initial.current ? 15 : 5);
      map = m;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);

      const icon = L.divIcon({ className: "", html: PIN_HTML, iconSize: [26, 26], iconAnchor: [4, 26] });
      let marker: any = null;

      const place = (p: LatLng, zoom?: number) => {
        if (marker) marker.setLatLng([p.lat, p.lng]);
        else {
          marker = L.marker([p.lat, p.lng], { icon, draggable: true }).addTo(m);
          marker.on("dragend", () => {
            const ll = marker.getLatLng();
            onChangeRef.current({ lat: round(ll.lat), lng: round(ll.lng) });
          });
        }
        if (zoom) m.setView([p.lat, p.lng], zoom);
      };
      setPointRef.current = (p, zoom) => {
        place(p, zoom);
        onChangeRef.current(p);
      };

      if (initial.current) place(initial.current);
      m.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        const p = { lat: round(e.latlng.lat), lng: round(e.latlng.lng) };
        place(p);
        onChangeRef.current(p);
      });
    })();

    return () => {
      cancelled = true;
      setPointRef.current = null;
      map?.remove();
    };
  }, []);

  function applyPaste() {
    const p = parseCoords(paste);
    if (!p) {
      setHint("Koordinat tidak terbaca. Contoh: -7.8053, 110.3642");
      return;
    }
    setHint(null);
    setPointRef.current?.(p, 16);
    setPaste("");
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setHint("Peramban tidak mendukung lokasi.");
      return;
    }
    setHint("Mencari lokasimu...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHint(null);
        setPointRef.current?.({ lat: round(pos.coords.latitude), lng: round(pos.coords.longitude) }, 16);
      },
      () => setHint("Lokasi tidak bisa diakses. Klik peta secara manual."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="space-y-2 font-normal">
      <div ref={box} className="relative z-0 h-72 w-full overflow-hidden rounded-lg border border-[#2c2c2c] sm:h-80" role="application" aria-label="Peta pemilih lokasi" />

      <p className="text-xs text-neutral-700">
        Klik peta untuk menaruh penanda, lalu seret untuk menggesernya.
        {value ? (
          <>
            {" "}Terpilih: <strong>{value.lat}, {value.lng}</strong>{" · "}
            <a href={`https://www.google.com/maps?q=${value.lat},${value.lng}`} target="_blank" rel="noopener noreferrer" className="text-brand-link underline">
              Buka di Google Maps
            </a>
          </>
        ) : (
          <> Belum ada lokasi dipilih.</>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyPaste();
            }
          }}
          placeholder="Tempel koordinat: -7.8053, 110.3642"
          aria-label="Tempel koordinat"
          className="h-9 min-w-0 flex-1 rounded-lg border border-[#2c2c2c] px-3 text-sm outline-none focus:ring-2 focus:ring-brand-link"
        />
        <button type="button" onClick={applyPaste} className="h-9 rounded-lg border border-neutral-400 px-3 text-sm hover:bg-neutral-50">
          Pakai
        </button>
        <button type="button" onClick={useMyLocation} className="h-9 rounded-lg border border-neutral-400 px-3 text-sm hover:bg-neutral-50">
          Lokasiku
        </button>
      </div>
      {hint && <p className="text-xs text-neutral-700">{hint}</p>}
    </div>
  );
}
