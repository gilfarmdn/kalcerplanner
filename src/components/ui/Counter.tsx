"use client";

import { CircleMinus, CirclePlus, Minus, Plus } from "lucide-react";

type Props = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
  /** "compact" = hero box (dark, small); "large" = Rencana form (white, big). */
  variant?: "compact" | "large";
  disabled?: boolean;
};

export default function Counter({ label, value, min = 0, max = 20, onChange, variant = "large", disabled }: Props) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  if (variant === "compact") {
    return (
      <div className="flex h-7 items-center justify-between rounded-[5px] border border-[rgba(248,168,31,0.8)] px-1.5 text-sm text-white">
        <button type="button" onClick={dec} disabled={disabled || value <= min} aria-label={`Kurangi ${label}`} className="disabled:opacity-40">
          <Minus size={16} />
        </button>
        <span aria-label={label}>{value}</span>
        <button type="button" onClick={inc} disabled={disabled || value >= max} aria-label={`Tambah ${label}`} className="disabled:opacity-40">
          <Plus size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex h-14 items-center justify-between rounded-[10px] border border-black bg-white px-3 text-xl font-medium sm:h-20 sm:px-[18px] sm:text-[25px] ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <button type="button" onClick={dec} disabled={disabled || value <= min} aria-label={`Kurangi ${label}`} className="disabled:opacity-40">
        <CircleMinus size={24} />
      </button>
      <span aria-label={label}>{value}</span>
      <button type="button" onClick={inc} disabled={disabled || value >= max} aria-label={`Tambah ${label}`} className="disabled:opacity-40">
        <CirclePlus size={24} />
      </button>
    </div>
  );
}
