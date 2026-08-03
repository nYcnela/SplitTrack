"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Scope, ExpenseDTO } from "@/lib/types";
import { ScopePicker } from "@/components/ScopePicker";
import { MonthPicker } from "@/components/MonthPicker";
import { ExpensesTable } from "@/components/ExpensesTable";
import { getSafeCurrentMonthString, getPreviousMonth, getNextMonth } from "@/lib/date";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function ExpensesPage() {
  const [scope, setScope] = useState<Scope>("cycle");
  const [month, setMonth] = useState("");
  const [q, setQ] = useState("");
  const latestRequestId = useRef(0);
  
  const [expenses, setExpenses] = useState<ExpenseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Paginacja
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setMonth(getSafeCurrentMonthString());
  }, []);

  useEffect(() => {
    // Reset paginacji przy zmianie scope/miesiąca
    setPage(0);
  }, [scope, month]);

  const fetchData = async () => {
    if (!month && scope === "month") return;
    const requestId = ++latestRequestId.current;

    try {
      setLoading(true);
      let endpoint = `/api/expenses?scope=${scope}`;
      if (scope === "month") endpoint += `&month=${month}`;
      const normalizedQuery = q.trim();
      if (normalizedQuery) {
        // Search mode: request a larger batch and apply client-side fallback filtering.
        endpoint += `&q=${encodeURIComponent(normalizedQuery)}&page=0&size=200&sort=expenseDate,desc`;
      } else {
        endpoint += `&page=${page}&size=20&sort=expenseDate,desc`;
      }

      const exps = await api.get(endpoint);
      if (requestId !== latestRequestId.current) return;

      const items: ExpenseDTO[] = Array.isArray(exps.items) ? exps.items : [];
      if (normalizedQuery) {
        const needle = normalizedQuery.toLocaleLowerCase("pl-PL");
        const filteredItems = items.filter((exp) =>
          (exp.description ?? "").toLocaleLowerCase("pl-PL").includes(needle)
        );
        setExpenses(filteredItems);
        setTotalPages(1);
      } else {
        setExpenses(items);
        setTotalPages(exps.page?.totalPages || 1);
      }
    } catch (err) {
      if (requestId === latestRequestId.current) {
        console.error(err);
      }
    } finally {
      if (requestId === latestRequestId.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, month, q, page]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <p className="app-page-title">Rejestr kosztów</p>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white mt-2">Wydatki</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1">Przeglądaj wszystkie dodane koszty.</p>
        </div>
        
        <Link 
          href="/expenses/new"
          className="self-end md:self-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Dodaj wydatek
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4 p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Szukaj po opisie..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            className="w-full px-4 py-2 border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
        
        <div className="w-full md:w-auto flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <ScopePicker scope={scope} onChange={setScope} />
          {scope === "month" && (
            <MonthPicker
              month={month}
              onChange={setMonth}
              onPrev={() => setMonth(getPreviousMonth(month))}
              onNext={() => setMonth(getNextMonth(month))}
            />
          )}
        </div>
      </div>

      <ExpensesTable expenses={expenses} loading={loading} />

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 border border-stone-200 dark:border-stone-800 rounded-xl text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
          >
            Poprzednia
          </button>
          
          <span className="text-sm text-stone-500 dark:text-stone-400 font-medium">
            Strona {page + 1} z {totalPages}
          </span>
          
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-4 py-2 border border-stone-200 dark:border-stone-800 rounded-xl text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
          >
            Następna
          </button>
        </div>
      )}
    </div>
  );
}
