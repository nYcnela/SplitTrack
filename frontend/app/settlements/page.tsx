"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, ArrowRightLeft, ChevronDown } from "lucide-react";
import type { SettlementDTO, Scope } from "@/lib/types";
import { SettlementsTable } from "@/components/SettlementsTable";
import { MonthPicker } from "@/components/MonthPicker";
import { getSafeCurrentMonthString, getPreviousMonth, getNextMonth } from "@/lib/date";

const settlementSchema = z.object({
  fromPerson: z.enum(["MACIEK", "EMILKA"]),
  toPerson: z.enum(["MACIEK", "EMILKA"]),
  amountPLN: z.number().positive("Kwota musi być większa od 0"),
  isFull: z.boolean(),
  note: z.string().optional(),
}).refine(data => data.fromPerson !== data.toPerson, {
  message: "Nadawca i odbiorca muszą być różni",
  path: ["toPerson"]
});

type SettlementFormValues = z.infer<typeof settlementSchema>;

export default function SettlementsPage() {
  const [scope, setScope] = useState<Scope>("month"); // default do month dla rozliczeń historycznych
  const [month, setMonth] = useState("");
  const [settlements, setSettlements] = useState<SettlementDTO[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  
  // Paginacja
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loadingForm, setLoadingForm] = useState(false);

  useEffect(() => {
    setMonth(getSafeCurrentMonthString());
  }, []);

  useEffect(() => {
    setPage(0);
  }, [scope, month]);

  const fetchSettlements = async () => {
    if (!month && scope === "month") return;
    try {
      setLoadingList(true);
      let endpoint = `/api/settlements?scope=${scope}`;
      if (scope === "month") endpoint += `&month=${month}`;
      endpoint += `&page=${page}&size=20&sort=createdAt,desc`;

      const data = await api.get(endpoint);
      setSettlements(data.items || []);
      setTotalPages(data.page?.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, month, page]);

  const form = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementSchema),
    defaultValues: {
      fromPerson: "MACIEK",
      toPerson: "EMILKA",
      amountPLN: undefined,
      isFull: true,
      note: "",
    }
  });

  const { watch, setValue, handleSubmit, reset, formState: { errors } } = form;
  const fromPerson = watch("fromPerson");
  const personSelectClassName =
    "w-full appearance-none px-3 pr-10 py-2 border border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-white theme-e:text-[#4a3840] focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors hover:border-stone-300 dark:hover:border-stone-700 text-sm font-medium";

  const handleSwapPeople = () => {
    setValue("fromPerson", fromPerson === "MACIEK" ? "EMILKA" : "MACIEK", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  // Automatycznie ustaw drugą osobę
  useEffect(() => {
    setValue("toPerson", fromPerson === "MACIEK" ? "EMILKA" : "MACIEK");
  }, [fromPerson, setValue]);

  const onSubmit = async (data: SettlementFormValues) => {
    try {
      setLoadingForm(true);
      await api.post("/api/settlements", data);
      toast.success("Rozliczenie zostało zapisane");
      reset({ ...data, amountPLN: undefined, note: "" }); // zachowaj osoby, resetuj kwotę
      fetchSettlements();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd dodawania rozliczenia");
    } finally {
      setLoadingForm(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white">Rozliczenia</h1>
        <p className="text-stone-500 dark:text-stone-400 mt-1">Zarządzaj przelewami między sobą.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formularz dodawania - sidebar na dużych ekranach */}
        <div className="lg:col-span-4 order-2 lg:order-1">
          <div className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm sticky top-24">
            <h2 className="text-lg font-bold text-stone-900 dark:text-white mb-4">Dodaj rozliczenie</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-500">Kto oddaje?</label>
                  <div className="relative">
                    <select
                      {...form.register("fromPerson")}
                      className={personSelectClassName}
                    >
                      <option value="MACIEK">Maciek</option>
                      <option value="EMILKA">Emilka</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 dark:text-stone-400 theme-e:text-[#8b6d7c]" />
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={handleSwapPeople}
                  className="mt-5 p-2 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 theme-e:focus:ring-pink-400"
                  title="Zamień osoby"
                  aria-label="Zamień osoby"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-500">Komu?</label>
                  <div className="relative">
                    <select
                      {...form.register("toPerson")}
                      className={personSelectClassName}
                    >
                      <option value="MACIEK">Maciek</option>
                      <option value="EMILKA">Emilka</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 dark:text-stone-400 theme-e:text-[#8b6d7c]" />
                  </div>
                </div>
              </div>
              {errors.toPerson && <p className="text-xs text-red-500">{errors.toPerson.message}</p>}

              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-500">Kwota wpłaty (PLN)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register("amountPLN", { valueAsNumber: true })}
                  className="w-full px-4 py-2 text-lg font-bold border border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50 dark:bg-stone-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.amountPLN && <p className="text-xs text-red-500">{errors.amountPLN.message}</p>}
              </div>

              <label className="flex items-center gap-3 p-3 border border-stone-200 dark:border-stone-800 rounded-xl cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors">
                <input 
                  type="checkbox" 
                  {...form.register("isFull")}
                  className="w-5 h-5 rounded border-stone-300 accent-indigo-600 theme-e:accent-fuchsia-500 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">To jest pełne rozliczenie salda</span>
              </label>

              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-500">Notatka (opcjonalnie)</label>
                <input
                  type="text"
                  placeholder="np. Przelew Blik"
                  {...form.register("note")}
                  className="w-full px-4 py-2 border border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50 dark:bg-stone-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loadingForm}
                className="w-full py-2.5 px-4 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
              >
                {loadingForm && <Loader2 className="w-5 h-5 animate-spin" />}
                Zapisz rozliczenie
              </button>
            </form>
          </div>
        </div>

        {/* Lista rozliczeń */}
        <div className="lg:col-span-8 order-1 lg:order-2 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-stone-900 dark:text-white">Historia</h2>
            <div className="w-full md:w-auto flex flex-col md:flex-row gap-3 items-stretch md:items-center">
              {scope === "month" && (
                <MonthPicker
                  month={month}
                  onChange={setMonth}
                  onPrev={() => setMonth(getPreviousMonth(month))}
                  onNext={() => setMonth(getNextMonth(month))}
                />
              )}
              {/* Ograniczamy opcje do month i lifetime, pomijamy cycle dla rozliczeń historycznych
                  ponieważ rozliczenia same w sobie zamykają cycle */}
              <div className="inline-flex w-full sm:w-auto p-1 bg-stone-100 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-800">
                <button
                  onClick={() => setScope("month")}
                  aria-pressed={scope === "month"}
                  data-active={scope === "month" ? "true" : "false"}
                  className={`scope-pill-button flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium text-center rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 theme-e:focus-visible:ring-pink-400 ${
                    scope === "month"
                      ? "bg-white dark:bg-stone-700 text-stone-700 dark:text-white shadow-sm"
                      : "text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/50 dark:hover:bg-stone-800"
                  }`}
                >Month</button>
                <button
                  onClick={() => setScope("lifetime")}
                  aria-pressed={scope === "lifetime"}
                  data-active={scope === "lifetime" ? "true" : "false"}
                  className={`scope-pill-button flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium text-center rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 theme-e:focus-visible:ring-pink-400 ${
                    scope === "lifetime"
                      ? "bg-white dark:bg-stone-700 text-stone-700 dark:text-white shadow-sm"
                      : "text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/50 dark:hover:bg-stone-800"
                  }`}
                >Lifetime</button>
              </div>
            </div>
          </div>

          <SettlementsTable settlements={settlements} loading={loadingList} />

          {!loadingList && totalPages > 1 && (
            <div className="flex items-center justify-between p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 border border-stone-200 dark:border-stone-800 rounded-xl text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50 transition-colors"
              >Poprzednia</button>
              <span className="text-sm text-stone-500 font-medium">Strona {page + 1} z {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 border border-stone-200 dark:border-stone-800 rounded-xl text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50 transition-colors"
              >Następna</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
