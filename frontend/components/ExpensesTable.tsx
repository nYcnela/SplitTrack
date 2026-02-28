"use client";

import type { ExpenseDTO } from "@/lib/types";
import { formatDateString } from "@/lib/date";

interface Props {
  expenses: ExpenseDTO[];
  loading?: boolean;
}

export function ExpensesTable({ expenses, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-stone-100 dark:bg-stone-800 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="py-12 text-center border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
        <p className="text-stone-500 dark:text-stone-400">Brak wydatków w tym zakresie</p>
      </div>
    );
  }

  const getSettleModeText = (mode: string) => {
    switch (mode) {
      case "NOT_SETTLED": return "Bez rozliczania";
      case "HALF": return "Na pół";
      case "CUSTOM": return "Custom";
      default: return mode;
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm">
      <table className="w-full text-sm text-left whitespace-nowrap">
        <thead className="text-xs text-stone-500 uppercase bg-stone-50 dark:bg-stone-900 dark:text-stone-400">
          <tr>
            <th className="px-6 py-4 font-medium">Data</th>
            <th className="px-6 py-4 font-medium">Przedmiot</th>
            {/* Maciek and Emilka columns — hidden on mobile */}
            <th className="px-6 py-4 font-medium text-right hidden md:table-cell">Maciek</th>
            <th className="px-6 py-4 font-medium text-right hidden md:table-cell">Emilka</th>
            <th className="px-6 py-4 font-medium text-right">PLN</th>
            <th className="px-6 py-4 font-medium">Tryb</th>
            <th className="px-6 py-4 font-medium">Waluta</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200 dark:divide-stone-800 bg-white dark:bg-stone-950">
          {expenses.map((exp) => (
            <tr key={exp.id} className="hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors">
              <td className="px-6 py-4 text-stone-500 dark:text-stone-400">
                {formatDateString(exp.expenseDate)}
              </td>
              <td className="px-6 py-4 font-medium text-stone-900 dark:text-white max-w-[200px] truncate" title={exp.description}>
                {exp.description}
              </td>
              {/* Hidden on mobile */}
              <td className="px-6 py-4 text-right hidden md:table-cell">
                {exp.payer === "MACIEK"
                  ? <span className="font-medium text-blue-600 dark:text-blue-400">{exp.amountPLN.toFixed(2)}</span>
                  : <span className="text-stone-300 dark:text-stone-700">-</span>}
              </td>
              <td className="px-6 py-4 text-right hidden md:table-cell">
                {exp.payer === "EMILKA"
                  ? <span className="font-medium text-purple-600 dark:text-purple-400">{exp.amountPLN.toFixed(2)}</span>
                  : <span className="text-stone-300 dark:text-stone-700">-</span>}
              </td>
              {/* PLN: mobile colored by payer, desktop neutral/high-contrast */}
              <td className={`pln-amount-cell px-6 py-4 text-right font-bold md:text-stone-900 md:dark:text-white ${
                exp.payer === "MACIEK"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-purple-600 dark:text-purple-400"
              }`}>
                {exp.amountPLN.toFixed(2)}
              </td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                  {getSettleModeText(exp.settlementMode)}
                </span>
              </td>
              <td className="px-6 py-4 text-stone-500 dark:text-stone-400 text-xs">
                {exp.originalCurrency !== "PLN" ? (
                  <div className="flex flex-col">
                    <span>{exp.originalAmount} {exp.originalCurrency}</span>
                    <span className="text-[10px] opacity-70">@{exp.exchangeRateToPLN}</span>
                  </div>
                ) : "PLN"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
