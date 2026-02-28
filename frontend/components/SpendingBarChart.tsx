"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { SpendingChartResponse } from "@/lib/types";

interface Props {
  data: SpendingChartResponse | null;
  loading?: boolean;
}

export function SpendingBarChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="h-64 bg-stone-100 dark:bg-stone-800/50 rounded-2xl animate-pulse flex items-center justify-center">
        <p className="text-stone-400">Ładowanie wykresu...</p>
      </div>
    );
  }

  if (!data || !data.labels || data.labels.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
        <p className="text-stone-500 text-sm">Brak danych do wykresu</p>
      </div>
    );
  }

  // Format data for Recharts
  const chartData = data.labels.map((label, index) => ({
    name: label === "MACIEK" ? "Maciek" : "Emilka",
    amount: data.values[index] || 0,
    fill: label === "MACIEK" ? "#3b82f6" : "#a855f7", // blue-500 and purple-500
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontWeight: 500 }} />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6b7280' }}
            tickFormatter={(value) => `${value} zł`}
          />
          <Tooltip 
            cursor={{ fill: '#f3f4f6', opacity: 0.4 }}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            formatter={(value: unknown) => [`${Number(value).toFixed(2)} zł`, 'Suma']}
          />
          <Bar dataKey="amount" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
