"use client";

import type { SummaryResponse } from "@/lib/types";
import { ArrowRightLeft, TrendingUp, CheckCircle2 } from "lucide-react";

interface Props {
  summary: SummaryResponse | null;
  loading?: boolean;
  title?: string;
}

export function SummaryCards({ summary, loading, title = "Podsumowanie" }: Props) {
  if (loading) {
    return (
      <div className="p-5 sm:p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded animate-pulse">
        <div className="h-6 bg-stone-200 dark:bg-stone-800 rounded w-1/3 mb-4"></div>
        <div className="flex gap-4">
          <div className="h-10 bg-stone-200 dark:bg-stone-800 rounded flex-1"></div>
          <div className="h-10 bg-stone-200 dark:bg-stone-800 rounded flex-1"></div>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const { balance, totalsSpent } = summary;
  const isEven = balance.direction === "EVEN";
  const maciekOwes = balance.direction === "MACIEK_OWES_EMILKA";

  return (
    <div className="p-5 sm:p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded shadow-sm">
      <h3 className="surface-heading mb-5">
        {title}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Saldo główne */}
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded flex-shrink-0 ${
              isEven
                ? "bg-emerald-200 text-emerald-700 ring-1 ring-emerald-300 shadow-sm dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800/50 theme-e:bg-emerald-200 theme-e:text-emerald-700 theme-e:ring-emerald-300"
                : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
            }`}
          >
            {isEven ? <CheckCircle2 className="w-7 h-7" /> : <ArrowRightLeft className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-1">Status rozliczeń</p>
            {isEven ? (
              <p className="text-xl font-bold text-stone-900 dark:text-white">Jesteście rozliczeni (0 zł)</p>
            ) : maciekOwes ? (
              <div className="flex flex-col">
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                  Maciek jest winny Emilce
                </p>
                <p className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                  {balance.amountPLN.toFixed(2)} zł
                </p>
              </div>
            ) : (
              <div className="flex flex-col">
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                  Emilka jest winna Maćkowi
                </p>
                <p className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                  {balance.amountPLN.toFixed(2)} zł
                </p>
              </div>
            )}
            
            {summary.lastSettlement && (
              <p className="text-xs text-stone-500 mt-2">
                Ostatnie rozliczenie: {summary.lastSettlement.createdAt.substring(0, 10)} 
                ({summary.lastSettlement.amountPLN} zł)
              </p>
            )}
          </div>
        </div>

        {/* Suma wydatków */}
        <div className="flex flex-col gap-3 justify-center">
          <div className="flex justify-between items-center p-3 bg-stone-50 dark:bg-stone-950 rounded border border-stone-100 dark:border-stone-800/50">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Wydatki Maćka</span>
            </div>
            <span className="font-bold text-stone-900 dark:text-white">{totalsSpent?.MACIEK?.toFixed(2) || "0.00"} zł</span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-stone-50 dark:bg-stone-950 rounded border border-stone-100 dark:border-stone-800/50">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Wydatki Emilki</span>
            </div>
            <span className="font-bold text-stone-900 dark:text-white">{totalsSpent?.EMILKA?.toFixed(2) || "0.00"} zł</span>
          </div>
        </div>
      </div>
    </div>
  );
}
