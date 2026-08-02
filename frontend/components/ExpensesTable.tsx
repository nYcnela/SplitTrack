"use client";

import { useState } from "react";
import type { ExpenseDTO } from "@/lib/types";
import { formatDateString } from "@/lib/date";
import { getApiBaseUrl } from "@/lib/api";

interface Props {
  expenses: ExpenseDTO[];
  loading?: boolean;
}

export function ExpensesTable({ expenses, loading }: Props) {
  const [receiptPreview, setReceiptPreview] = useState<{ urls: string[]; index: number; title: string } | null>(null);
  const API_BASE_URL = getApiBaseUrl();
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

  const resolveReceiptUrls = (receiptUrl?: string | null) => {
    if (!receiptUrl) return [];
    const trimmed = receiptUrl.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
            .map(resolveReceiptUrl)
            .filter((entry): entry is string => Boolean(entry));
        }
      } catch {
        return [];
      }
    }
    const resolved = resolveReceiptUrl(trimmed);
    return resolved ? [resolved] : [];
  };

  const formatDecimal = (value?: number | null) => {
    if (value == null || Number.isNaN(value)) return "—";
    return decimalFormatter.format(value);
  };

  const showPreviousReceipt = () => {
    setReceiptPreview((current) => {
      if (!current) return current;
      return {
        ...current,
        index: current.index === 0 ? current.urls.length - 1 : current.index - 1,
      };
    });
  };

  const showNextReceipt = () => {
    setReceiptPreview((current) => {
      if (!current) return current;
      return {
        ...current,
        index: current.index === current.urls.length - 1 ? 0 : current.index + 1,
      };
    });
  };

  return (
    <>
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
            {expenses.map((exp) => {
              const receiptUrls = resolveReceiptUrls(exp.receiptUrl);
              return (
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
                    {receiptUrls.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setReceiptPreview({ urls: receiptUrls, index: 0, title: exp.description })}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 underline underline-offset-2"
                      >
                        {receiptUrls.length === 1 ? "Zobacz zdjęcie" : `Zobacz zdjęcia (${receiptUrls.length})`}
                      </button>
                    ) : (
                      <span className="text-stone-400 dark:text-stone-600 text-xs">Brak</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {receiptPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setReceiptPreview(null)}
        >
          <div
            className="flex h-[100dvh] w-full max-w-4xl flex-col bg-stone-950 shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-xl sm:border sm:border-stone-700"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex min-h-16 items-center justify-between gap-3 border-b border-stone-800 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{receiptPreview.title}</div>
                <div className="text-xs text-stone-400">
                  Zdjęcie {receiptPreview.index + 1} / {receiptPreview.urls.length}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceiptPreview(null)}
                className="rounded-lg px-3 py-1 text-sm font-medium text-stone-300 hover:bg-stone-900 hover:text-white"
              >
                Zamknij
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-black px-0 pb-6 sm:pb-0">
              {receiptPreview.urls.length > 1 && (
                <button
                  type="button"
                  onClick={showPreviousReceipt}
                  className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-2xl text-white hover:bg-black/70 sm:left-3 sm:h-10 sm:w-10"
                  aria-label="Poprzednie zdjęcie"
                >
                  ‹
                </button>
              )}
              <img
                src={receiptPreview.urls[receiptPreview.index]}
                alt={`Paragon ${receiptPreview.index + 1}`}
                className="h-auto max-h-[calc(100dvh-10rem)] w-auto max-w-full object-contain sm:max-h-[72vh]"
              />
              {receiptPreview.urls.length > 1 && (
                <button
                  type="button"
                  onClick={showNextReceipt}
                  className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-2xl text-white hover:bg-black/70 sm:right-3 sm:h-10 sm:w-10"
                  aria-label="Następne zdjęcie"
                >
                  ›
                </button>
              )}
            </div>

            <div className="flex min-h-14 items-center justify-between gap-3 border-t border-stone-800 px-4 py-3">
              <div className="flex gap-1">
                {receiptPreview.urls.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    onClick={() => setReceiptPreview((current) => current ? { ...current, index } : current)}
                    className={`h-2.5 w-2.5 rounded-full ${
                      index === receiptPreview.index ? "bg-indigo-400" : "bg-stone-700 hover:bg-stone-500"
                    }`}
                    aria-label={`Pokaż zdjęcie ${index + 1}`}
                  />
                ))}
              </div>
              <a
                href={receiptPreview.urls[receiptPreview.index]}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-indigo-300 underline underline-offset-2 hover:text-indigo-200"
              >
                Otwórz w nowej karcie
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
