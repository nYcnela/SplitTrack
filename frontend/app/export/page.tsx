"use client";

import { useState, useEffect } from "react";
import type { Scope } from "@/lib/types";
import { ScopePicker } from "@/components/ScopePicker";
import { MonthPicker } from "@/components/MonthPicker";
import { ExportPanel } from "@/components/ExportPanel";
import { getSafeCurrentMonthString, getPreviousMonth, getNextMonth } from "@/lib/date";

export default function ExportPage() {
  const [scopeExp, setScopeExp] = useState<Scope>("month");
  const [monthExp, setMonthExp] = useState("");
  const [qExp, setQExp] = useState("");

  const [scopeSet, setScopeSet] = useState<Scope>("month");
  const [monthSet, setMonthSet] = useState("");

  useEffect(() => {
    const cur = getSafeCurrentMonthString();
    setMonthExp(cur);
    setMonthSet(cur);
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-b border-stone-200 dark:border-stone-800 pb-5">
        <p className="app-page-title">Archiwum danych</p>
        <h1 className="text-3xl font-bold text-stone-900 dark:text-white mt-2">Eksport Danych</h1>
        <p className="text-stone-500 dark:text-stone-400 mt-1">Pobierz swoje wydatki i rozliczenia w formacie CSV lub Excel.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Eksport Wydatków */}
        <div className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
              Eksport Wydatków
            </h2>
            <p className="text-sm text-stone-500 mt-1">Pobierz listę pojedynczych kosztów.</p>
          </div>

          <div className="space-y-4 pt-4 border-t border-stone-100 dark:border-stone-800">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Zakres czasu</label>
              <div className="flex gap-4 items-center">
                <ScopePicker scope={scopeExp} onChange={setScopeExp} />
              </div>
            </div>

            {scopeExp === "month" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Miesiąc</label>
                <div>
                  <MonthPicker
                    month={monthExp}
                    onChange={setMonthExp}
                    onPrev={() => setMonthExp(getPreviousMonth(monthExp))}
                    onNext={() => setMonthExp(getNextMonth(monthExp))}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Szukaj (opcjonalnie)</label>
              <input
                type="text"
                placeholder="np. Biedronka"
                value={qExp}
                onChange={(e) => setQExp(e.target.value)}
                className="w-full px-4 py-2 border border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50 dark:bg-stone-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <ExportPanel
              exportType="expenses"
              scope={scopeExp}
              monthStr={monthExp}
              queryParam={qExp}
            />
          </div>
        </div>

        {/* Eksport Rozliczeń */}
        <div className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
              Eksport Rozliczeń
            </h2>
            <p className="text-sm text-stone-500 mt-1">Pobierz listę dokonanych przelewów wyrównujących.</p>
          </div>

          <div className="space-y-4 pt-4 border-t border-stone-100 dark:border-stone-800">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Zakres czasu</label>
              <div className="flex gap-4 items-center">
                <div className="inline-flex p-1 bg-stone-100 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-800">
                  <button
                    onClick={() => setScopeSet("month")}
                    aria-pressed={scopeSet === "month"}
                    data-active={scopeSet === "month" ? "true" : "false"}
                    className={`scope-pill-button px-4 py-1.5 text-sm font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 theme-e:focus-visible:ring-pink-400 ${
                      scopeSet === "month"
                        ? "bg-white dark:bg-stone-700 text-stone-700 dark:text-white shadow-sm"
                        : "text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/50 dark:hover:bg-stone-800"
                    }`}
                  >Month</button>
                  <button
                    onClick={() => setScopeSet("lifetime")}
                    aria-pressed={scopeSet === "lifetime"}
                    data-active={scopeSet === "lifetime" ? "true" : "false"}
                    className={`scope-pill-button px-4 py-1.5 text-sm font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 theme-e:focus-visible:ring-pink-400 ${
                      scopeSet === "lifetime"
                        ? "bg-white dark:bg-stone-700 text-stone-700 dark:text-white shadow-sm"
                        : "text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/50 dark:hover:bg-stone-800"
                    }`}
                  >Lifetime</button>
                </div>
              </div>
            </div>

            {scopeSet === "month" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Miesiąc</label>
                <div>
                  <MonthPicker
                    month={monthSet}
                    onChange={setMonthSet}
                    onPrev={() => setMonthSet(getPreviousMonth(monthSet))}
                    onNext={() => setMonthSet(getNextMonth(monthSet))}
                  />
                </div>
              </div>
            )}

            <ExportPanel
              exportType="settlements"
              scope={scopeSet}
              monthStr={monthSet}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
