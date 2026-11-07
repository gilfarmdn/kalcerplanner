"use client";

type Props = {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
};

/** Accessible on/off switch (iOS-style green when on, as in the Figma design). */
export default function Toggle({ checked, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-brand-leaf" : "bg-neutral-300"
      }`}
    >
      <span
        className={`inline-block h-7 w-7 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
