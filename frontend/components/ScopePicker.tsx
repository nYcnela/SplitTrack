"use client";
import type { Scope } from "@/lib/types";
import { clsx } from "clsx";

interface Props {
  scope: Scope;
  onChange: (scope: Scope) => void;
}

export function ScopePicker({ scope, onChange }: Props) {
  const options: { label: string; value: Scope }[] = [
    { label: "Cycle", value: "cycle" },
    { label: "Month", value: "month" },
    { label: "Lifetime", value: "lifetime" },
  ];

  return (
    <div className="inline-flex w-full sm:w-auto p-1 bg-stone-100 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-800">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          aria-pressed={scope === opt.value}
          data-active={scope === opt.value ? "true" : "false"}
          className={clsx(
            "scope-pill-button flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium text-center rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 theme-e:focus-visible:ring-pink-400",
            scope === opt.value
              ? "bg-white dark:bg-stone-700 text-stone-700 dark:text-white shadow-sm"
              : "text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/50 dark:hover:bg-stone-800"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
