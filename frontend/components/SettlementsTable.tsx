"use client";

import type { SettlementDTO } from "@/lib/types";
import { formatDateTimeString } from "@/lib/date";

interface Props {
  settlements: SettlementDTO[];
  loading?: boolean;
}

export function SettlementsTable({ settlements, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-stone-100 dark:bg-stone-800 animate-pulse rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (settlements.length === 0) {
    return (
      <div className="py-12 text-center border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
        <p className="text-stone-500 dark:text-stone-400">Brak rozliczeń w tym zakresie</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm">
      <table className="w-full text-sm text-left whitespace-nowrap">
        <thead className="text-xs text-stone-500 uppercase bg-stone-50 dark:bg-stone-900 dark:text-stone-400">
          <tr>
            <th className="px-6 py-4 font-medium">Data dodania (UTC)</th>
            <th className="px-6 py-4 font-medium">Od</th>
            <th className="px-6 py-4 font-medium">Do</th>
            <th className="px-6 py-4 font-medium text-right">Kwota (PLN)</th>
            <th className="px-6 py-4 font-medium">Typ</th>
            <th className="px-6 py-4 font-medium">Notatka</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200 dark:divide-stone-800 bg-white dark:bg-stone-950">
          {settlements.map((s) => (
            <tr key={s.id} className="hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors">
              <td className="px-6 py-4 text-stone-500 dark:text-stone-400">
                {formatDateTimeString(s.createdAt)}
              </td>
              <td className="px-6 py-4 font-medium text-stone-900 dark:text-white">
                {s.fromPerson === "MACIEK" ? "Maciek" : "Emilka"}
              </td>
              <td className="px-6 py-4 font-medium text-stone-900 dark:text-white">
                {s.toPerson === "MACIEK" ? "Maciek" : "Emilka"}
              </td>
              <td className="px-6 py-4 text-right font-bold text-stone-900 dark:text-white">
                {s.amountPLN.toFixed(2)}
              </td>
              <td className="px-6 py-4">
                {s.isFull ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border border-emerald-200 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-900/50 theme-e:bg-emerald-100 theme-e:text-emerald-800 theme-e:border-emerald-300">
                    Pełne
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border border-amber-200 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-900/50 theme-e:bg-orange-100 theme-e:text-orange-800 theme-e:border-orange-300">
                    Częściowe
                  </span>
                )}
              </td>
              <td className="px-6 py-4 text-stone-500 max-w-[200px] truncate" title={s.note || ""}>
                {s.note || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
