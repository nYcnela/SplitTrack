"use client";

import type { ExpenseDTO } from "@/lib/types";
import { formatDateString } from "@/lib/date";

interface Props {
  expenses: ExpenseDTO[];
  loading?: boolean;
}

export function ExpensesTable({ expenses, loading }: Props) {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
  const decimalFormatter = new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
      case "FULL": return "Całość";
      case "CUSTOM": return "Custom";
      default: return mode;
    }
  };

  const resolveReceiptUrl = (receiptUrl?: string | null) => {
    if (!receiptUrl) return null;
    if (receiptUrl.startsWith("http://") || receiptUrl.startsWith("https://")) {
      return receiptUrl;
    }
    if (receiptUrl.startsWith("/")) {
      return `${API_BASE_URL}${receiptUrl}`;
    }
    return `${API_BASE_URL}/${receiptUrl}`;
  };

  const formatDecimal = (value?: number | null) => {
    if (value == null || Number.isNaN(value)) return "—";
    return decimalFormatter.format(value);
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm">
      <table className="w-full text-sm text-left whitespace-nowrap">
        <thead className="text-xs text-stone-500 uppercase bg-stone-50 dark:bg-stone-900 dark:text-stone-400">
          <tr>
            <th className="px-6 py-4 font-medium">Data</th>
            <th className="px-6 py-4 font-medium">Przedmiot</th>
            {/* <th className="px-6 py-4 font-medium text-right">Maciek</th>
            <th className="px-6 py-4 font-medium text-right">Emilka</th> */}
            <th className="px-6 py-4 font-medium text-right">PLN</th>
            <th className="px-6 py-4 font-medium">Tryb</th>
            <th className="px-6 py-4 font-medium">Waluta</th>
            <th className="px-6 py-4 font-medium">Paragon</th>
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
              {/* <td className="px-6 py-4 text-right">
                {exp.payer === "MACIEK"
                  ? <span className="font-medium text-blue-600 dark:text-blue-400">{exp.amountPLN.toFixed(2)}</span>
                  : <span className="text-stone-300 dark:text-stone-700">-</span>}
              </td>
              <td className="px-6 py-4 text-right">
                {exp.payer === "EMILKA"
                  ? <span className="font-medium text-purple-600 dark:text-purple-400">{exp.amountPLN.toFixed(2)}</span>
                  : <span className="text-stone-300 dark:text-stone-700">-</span>}
              </td> */}
              {/* PLN is always colored by payer */}
              <td className={`px-6 py-4 text-right font-bold ${
                exp.payer === "MACIEK"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-purple-600 dark:text-purple-400"
              }`}>
                {exp.amountPLN.toFixed(2)}
              </td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300 theme-e:bg-pink-100 theme-e:text-fuchsia-700 theme-e:border theme-e:border-pink-200">
                  {getSettleModeText(exp.settlementMode)}
                </span>
              </td>
              <td className="px-6 py-4 text-stone-500 dark:text-stone-400 text-xs">
                {exp.originalCurrency !== "PLN" ? (
                  <div className="flex flex-col">
                    <span>{formatDecimal(exp.originalAmount)} {exp.originalCurrency}</span>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">
                      1 {exp.originalCurrency} = {formatDecimal(exp.exchangeRateToPLN)} PLN
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <span>PLN</span>
                    <span className="text-[11px] text-stone-400 dark:text-stone-600">—</span>
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                {resolveReceiptUrl(exp.receiptUrl) ? (
                  <a
                    href={resolveReceiptUrl(exp.receiptUrl) || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 underline underline-offset-2"
                  >
                    Zobacz zdjęcie
                  </a>
                ) : (
                  <span className="text-stone-400 dark:text-stone-600 text-xs">Brak</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
