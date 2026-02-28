"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Scope, SummaryResponse, SpendingChartResponse, ExpenseDTO } from "@/lib/types";
import { ScopePicker } from "@/components/ScopePicker";
import { MonthPicker } from "@/components/MonthPicker";
import { SummaryCards } from "@/components/SummaryCards";
import { SpendingBarChart } from "@/components/SpendingBarChart";
import { getSafeCurrentMonthString, getPreviousMonth, getNextMonth } from "@/lib/date";
import { ExpensesTable } from "@/components/ExpensesTable";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Dashboard() {
  const [scope, setScope] = useState<Scope>("cycle");
  const [month, setMonth] = useState("");
  const latestMainRequestId = useRef(0);
  const latestSideRequestId = useRef(0);
  
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [chartData, setChartData] = useState<SpendingChartResponse | null>(null);
  const [recentExpenses, setRecentExpenses] = useState<ExpenseDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Kafelki poboczne (zawsze widoczne)
  const [monthSummary, setMonthSummary] = useState<SummaryResponse | null>(null);
  const [lifetimeSummary, setLifetimeSummary] = useState<SummaryResponse | null>(null);

  useEffect(() => {
    setMonth(getSafeCurrentMonthString());
  }, []);

  const fetchData = async () => {
    if (!month && scope === "month") return;
    const requestId = ++latestMainRequestId.current;
    try {
      setLoading(true);
      const [sumRes, chartRes, expRes] = await Promise.all([
        api.get(`/api/summary?scope=${scope}${scope === "month" ? `&month=${month}` : ""}`),
        api.get(`/api/charts/spending?scope=${scope}${scope === "month" ? `&month=${month}` : ""}`),
        api.get(`/api/expenses?scope=${scope}${scope === "month" ? `&month=${month}` : ""}&page=0&size=5&sort=expenseDate,desc`)
      ]);

      if (requestId !== latestMainRequestId.current) return;

      setSummary(sumRes);
      setChartData(chartRes);
      setRecentExpenses(expRes.items);
    } catch (err) {
      if (requestId === latestMainRequestId.current) {
        console.error(err);
      }
    } finally {
      if (requestId === latestMainRequestId.current) {
        setLoading(false);
      }
    }
  };

  const fetchSideKafels = async () => {
    if (!month) return;
    const requestId = ++latestSideRequestId.current;
    try {
      const [mRes, lRes] = await Promise.all([
        api.get(`/api/summary?scope=month&month=${month}`),
        api.get(`/api/summary?scope=lifetime`)
      ]);

      if (requestId !== latestSideRequestId.current) return;

      setMonthSummary(mRes);
      setLifetimeSummary(lRes);
    } catch (err) {
      if (requestId === latestSideRequestId.current) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, month]);

  useEffect(() => {
    fetchSideKafels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white">Dashboard</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1">Podsumowanie Waszych wydatków.</p>
        </div>
        
        <div className="w-full md:w-auto flex flex-col md:flex-row gap-3 items-stretch md:items-center md:justify-end">
          {scope === "month" && (
            <MonthPicker
              month={month}
              onChange={setMonth}
              onPrev={() => setMonth(getPreviousMonth(month))}
              onNext={() => setMonth(getNextMonth(month))}
            />
          )}
          <ScopePicker scope={scope} onChange={setScope} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <SummaryCards summary={summary} loading={loading} title={`Podsumowanie główny zakres (${scope === 'cycle' ? 'Obecny cykl' : scope === 'month' ? month : 'Od początku'})`} />
          
          <div className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm">
            <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-6">Rozkład wydatków</h3>
            <SpendingBarChart data={chartData} loading={loading} />
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Ostatnie wydatki</h3>
              <Link href="/expenses" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1">
                Wszystkie wydatki <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <ExpensesTable expenses={recentExpenses} loading={loading} />
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-stone-900 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider mb-4">W wybranym miesiącu ({month || getSafeCurrentMonthString()})</h3>
            {monthSummary ? (
              <div>
                <div className="text-sm text-stone-600 dark:text-stone-400">
                  {monthSummary.balance.direction === "EVEN" ? "Jesteście rozliczeni" :
                   monthSummary.balance.direction === "MACIEK_OWES_EMILKA" ? "Maciek winny Emilce:" : "Emilka winna Maćkowi:"}
                </div>
                <div className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
                  {monthSummary.balance.amountPLN.toFixed(2)} zł
                </div>
                <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-stone-800 flex justify-between text-sm">
                  <span className="text-stone-500">Razem wydano:</span>
                  <span className="font-semibold text-stone-700 dark:text-stone-300">
                    {((monthSummary.totalsSpent?.MACIEK || 0) + (monthSummary.totalsSpent?.EMILKA || 0)).toFixed(2)} zł
                  </span>
                </div>
              </div>
            ) : (
              <div className="animate-pulse h-16 bg-white/50 dark:bg-stone-800/50 rounded-lg"></div>
            )}
          </div>

          <div className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm">
            <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-4">Saldo całkowite (Lifetime)</h3>
            {lifetimeSummary ? (
              <div>
                <div className="text-sm text-stone-600 dark:text-stone-400">
                  {lifetimeSummary.balance.direction === "EVEN" ? "Jesteście rozliczeni" :
                   lifetimeSummary.balance.direction === "MACIEK_OWES_EMILKA" ? "Maciek winny Emilce:" : "Emilka winna Maćkowi:"}
                </div>
                <div className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
                  {lifetimeSummary.balance.amountPLN.toFixed(2)} zł
                </div>
              </div>
            ) : (
              <div className="animate-pulse h-16 bg-stone-100 dark:bg-stone-800 rounded-lg"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
