"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { DownloadCloud, FileSpreadsheet, Loader2 } from "lucide-react";
import type { Scope } from "@/lib/types";

interface Props {
  exportType: "expenses" | "settlements";
  scope: Scope;
  monthStr: string;
  queryParam?: string;
}

export function ExportPanel({ exportType, scope, monthStr, queryParam }: Props) {
  const [loadingType, setLoadingType] = useState<"csv" | "xlsx" | null>(null);

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      setLoadingType(format);
      let endpoint = `/api/export/${exportType}.${format}?scope=${scope}`;
      if (scope === "month") {
        endpoint += `&month=${monthStr}`;
      }
      if (queryParam) {
        endpoint += `&q=${encodeURIComponent(queryParam)}`;
      }

      const blob = await api.getBlob(endpoint);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exportType}_${scope}${scope === "month" ? `_${monthStr}` : ""}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      
      toast.success(`Pobrano plik ${format.toUpperCase()}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd pobierania");
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="flex gap-3 mt-4">
      <button
        onClick={() => handleExport("csv")}
        disabled={loadingType !== null}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors shadow-sm disabled:opacity-50 text-sm font-medium"
      >
        {loadingType === "csv" ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4 text-emerald-600" />}
        Pobierz CSV
      </button>
      <button
        onClick={() => handleExport("xlsx")}
        disabled={loadingType !== null}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors shadow-sm disabled:opacity-50 text-sm font-medium"
      >
        {loadingType === "xlsx" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
        Pobierz XLSX
      </button>
    </div>
  );
}
