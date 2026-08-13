"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type AppSelectOption = { value: string; label: string };

type Props = {
  value: string;
  options: AppSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
};

export function AppSelect({ value, options, onChange, ariaLabel, disabled = false, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const move = (direction: 1 | -1) => {
    const current = Math.max(0, options.findIndex((option) => option.value === value));
    const next = Math.min(options.length - 1, Math.max(0, current + direction));
    onChange(options[next].value);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            move(event.key === "ArrowDown" ? 1 : -1);
          }
        }}
        className="flex min-h-10 w-full items-center justify-between rounded border border-stone-200 bg-stone-50 px-3 py-2 text-left text-sm font-medium text-stone-900 shadow-sm outline-none transition hover:border-stone-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:hover:border-stone-600 theme-e:border-pink-200 theme-e:bg-white theme-e:text-[#4a3840] theme-e:focus:border-fuchsia-400 theme-e:focus:ring-fuchsia-400/20"
      >
        <span className="truncate">{selected?.label ?? "Wybierz"}</span>
        <ChevronDown className={`ml-3 h-4 w-4 shrink-0 text-stone-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && !disabled && (
        <div role="listbox" aria-label={ariaLabel} className="app-menu-surface absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded border border-stone-200 bg-white p-1 shadow-xl dark:border-stone-700 dark:bg-stone-900 theme-e:border-pink-200 theme-e:bg-white">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => { onChange(option.value); setOpen(false); }}
                className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm transition-colors ${active ? "bg-indigo-600 text-white theme-e:bg-fuchsia-500" : "text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800 theme-e:text-[#4a3840] theme-e:hover:bg-pink-50"}`}
              >
                <span className="truncate">{option.label}</span>
                {active && <Check className="ml-3 h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
