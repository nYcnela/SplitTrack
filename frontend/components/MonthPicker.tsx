"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  month: string; // YYYY-MM
  onChange: (month: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function MonthPicker({ month, onChange, onPrev, onNext }: Props) {
  return (
    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] sm:flex items-center gap-2 w-full sm:w-auto">
      <button
        onClick={onPrev}
        className="h-10 w-10 flex items-center justify-center border border-stone-200 dark:border-stone-800 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <input
        type="month"
        value={month}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
        className="w-full min-w-0 sm:min-w-[180px] px-4 py-1.5 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button
        onClick={onNext}
        className="h-10 w-10 flex items-center justify-center border border-stone-200 dark:border-stone-800 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
