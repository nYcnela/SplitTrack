"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, ChevronDown, Loader2, Upload, X } from "lucide-react";
import Link from "next/link";

const expenseSchema = z.object({
  expenseDate: z.string().min(1, "Data jest wymagana"),
  description: z.string().min(1, "Opis jest wymagany").max(200, "Za długi opis"),
  payer: z.enum(["MACIEK", "EMILKA"]),
  settlementMode: z.enum(["NOT_SETTLED", "HALF", "FULL", "CUSTOM"]),
  inputAmount: z.number().positive("Kwota musi być większa od 0"),
  inputCurrency: z.string().min(1, "Wybierz walutę"),
  exchangeRateToPLN: z.number().optional().nullable(),
  customOwedPLN: z.number().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.inputCurrency !== "PLN" && (!data.exchangeRateToPLN || data.exchangeRateToPLN <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Kurs wymiany jest wymagany dla waluty innej niż PLN",
      path: ["exchangeRateToPLN"],
    });
  }
  if (data.settlementMode === "CUSTOM" && (!data.customOwedPLN || data.customOwedPLN <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Podaj kwotę do oddania",
      path: ["customOwedPLN"],
    });
  }
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

export default function NewExpensePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expenseDate: format(new Date(), "yyyy-MM-dd"),
      description: "",
      payer: "MACIEK",
      settlementMode: "HALF",
      inputAmount: undefined,
      inputCurrency: "PLN",
      exchangeRateToPLN: 1.0,
      customOwedPLN: undefined,
    }
  });

  const { watch, handleSubmit, formState: { errors } } = form;
  const currency = watch("inputCurrency");
  const settlementMode = watch("settlementMode");
  
  const isForeign = currency !== "PLN";
  const selectClassName =
    "w-full appearance-none px-4 pr-10 py-2 border border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-white theme-e:text-[#4a3840] focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors hover:border-stone-300 dark:hover:border-stone-700";

  const onSubmit = async (data: ExpenseFormValues) => {
    try {
      setLoading(true);
      // Clean up optional fields
      if (!isForeign) data.exchangeRateToPLN = 1.0;
      if (data.settlementMode !== "CUSTOM") data.customOwedPLN = null;

      let uploadedReceiptUrl: string | null = null;
      if (receiptFile) {
        const formData = new FormData();
        formData.append("file", receiptFile);
        const uploadResponse = await api.postFormData("/api/expenses/receipt", formData) as { receiptUrl?: string };
        uploadedReceiptUrl = uploadResponse.receiptUrl ?? null;
      }

      await api.post("/api/expenses", {
        ...data,
        receiptUrl: uploadedReceiptUrl,
      });
      toast.success("Dodano wydatek");
      router.push("/expenses");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd dodawania wydatku");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white">Dodaj wydatek</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1">Zarejestruj nowy koszt.</p>
        </div>
        <Link 
          href="/expenses"
          className="p-2 border border-stone-200 dark:border-stone-800 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-stone-500" />
        </Link>
      </div>

      <div className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Data dodania</label>
              <input
                type="date"
                {...form.register("expenseDate")}
                className="w-full px-4 py-2 border border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50 dark:bg-stone-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.expenseDate && <p className="text-xs text-red-500">{errors.expenseDate.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Kto płacił?</label>
              <div className="flex bg-stone-100 dark:bg-stone-950 p-1 rounded-xl border border-stone-200 dark:border-stone-800">
                <label className="flex-1">
                  <input type="radio" value="MACIEK" {...form.register("payer")} className="peer sr-only" />
                  <div className="text-center px-4 py-1.5 text-sm font-medium rounded-lg cursor-pointer peer-checked:bg-white dark:peer-checked:bg-stone-800 peer-checked:text-indigo-600 dark:peer-checked:text-indigo-400 peer-checked:shadow-sm text-stone-500 hover:text-stone-900 transition-all">
                    Maciek
                  </div>
                </label>
                <label className="flex-1">
                  <input type="radio" value="EMILKA" {...form.register("payer")} className="peer sr-only" />
                  <div className="text-center px-4 py-1.5 text-sm font-medium rounded-lg cursor-pointer peer-checked:bg-white dark:peer-checked:bg-stone-800 peer-checked:text-indigo-600 dark:peer-checked:text-indigo-400 peer-checked:shadow-sm text-stone-500 hover:text-stone-900 transition-all">
                    Emilka
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Opis / Przedmiot</label>
            <input
              type="text"
              placeholder="np. Zakupy w Biedronce"
              {...form.register("description")}
              className="w-full px-4 py-2 border border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50 dark:bg-stone-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Paragon (opcjonalnie)</label>
            <input
              ref={receiptInputRef}
              id="receipt-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setReceiptFile(file);
              }}
              className="sr-only"
            />
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 p-2">
              <button
                type="button"
                onClick={() => receiptInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
              >
                <Upload className="w-4 h-4" />
                {receiptFile ? "Zmień zdjęcie" : "Wybierz zdjęcie"}
              </button>
              <span className="flex-1 min-w-0 truncate text-sm text-stone-600 dark:text-stone-300">
                {receiptFile ? receiptFile.name : "Nie wybrano pliku"}
              </span>
              {receiptFile && (
                <button
                  type="button"
                  onClick={() => {
                    setReceiptFile(null);
                    if (receiptInputRef.current) {
                      receiptInputRef.current.value = "";
                    }
                  }}
                  className="p-2 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-white dark:hover:bg-stone-800 transition-colors"
                  aria-label="Usuń wybrany plik"
                  title="Usuń plik"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Dozwolone formaty: JPG, PNG, WEBP, GIF (max 10 MB).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Kwota</label>
              <input
                type="number"
                step="0.01"
                placeholder="100.00"
                {...form.register("inputAmount", { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50 dark:bg-stone-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.inputAmount && <p className="text-xs text-red-500">{errors.inputAmount.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Waluta</label>
              <div className="relative">
                <select
                  {...form.register("inputCurrency")}
                  className={selectClassName}
                >
                  <option value="PLN">PLN</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="CZK">CZK</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 dark:text-stone-400 theme-e:text-[#8b6d7c]" />
              </div>
            </div>
          </div>

          {isForeign && (
            <div className="space-y-2 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30">
              <label className="text-sm font-medium text-amber-800 dark:text-amber-500">
                Kurs wymiany (z {currency} na PLN)
              </label>
              <input
                type="number"
                step="0.0001"
                placeholder="4.35"
                {...form.register("exchangeRateToPLN", { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-amber-200 dark:border-amber-800/50 rounded-xl bg-white dark:bg-stone-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {errors.exchangeRateToPLN && <p className="text-xs text-red-500">{errors.exchangeRateToPLN.message}</p>}
            </div>
          )}

          <div className="space-y-4 pt-4 border-t border-stone-100 dark:border-stone-800">
            <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Tryb rozliczenia</label>
            <div className="flex flex-col gap-3">
              <label className="flex items-center p-4 border border-stone-200 dark:border-stone-800 rounded-xl cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50 dark:has-[:checked]:bg-indigo-900/10">
                <input type="radio" value="HALF" {...form.register("settlementMode")} className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-stone-300" />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-stone-900 dark:text-white">Na pół</span>
                  <span className="block text-sm text-stone-500">Koszty dzielone są po równo (50/50).</span>
                </div>
              </label>
              <label className="flex items-center p-4 border border-stone-200 dark:border-stone-800 rounded-xl cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50 dark:has-[:checked]:bg-indigo-900/10">
                <input type="radio" value="NOT_SETTLED" {...form.register("settlementMode")} className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-stone-300" />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-stone-900 dark:text-white">Bez rozliczania</span>
                  <span className="block text-sm text-stone-500">Wydatek nie wpływa na saldo końcowe, tylko śledzimy koszt.</span>
                </div>
              </label>
              <label className="flex items-center p-4 border border-stone-200 dark:border-stone-800 rounded-xl cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50 dark:has-[:checked]:bg-indigo-900/10">
                <input type="radio" value="FULL" {...form.register("settlementMode")} className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-stone-300" />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-stone-900 dark:text-white">Druga osoba oddaje całość</span>
                  <span className="block text-sm text-stone-500">Ktoś zapłacił za zakupy drugiej osoby, więc do oddania jest 100% kwoty.</span>
                </div>
              </label>
              <label className="flex items-center p-4 border border-stone-200 dark:border-stone-800 rounded-xl cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50 dark:has-[:checked]:bg-indigo-900/10">
                <input type="radio" value="CUSTOM" {...form.register("settlementMode")} className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-stone-300" />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-stone-900 dark:text-white">Custom</span>
                  <span className="block text-sm text-stone-500">Druga osoba ma oddać konkretną kwotę.</span>
                </div>
              </label>
            </div>
          </div>

          {settlementMode === "CUSTOM" && (
            <div className="space-y-2 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-700 text-sm">
              <label className="font-medium text-stone-700 dark:text-stone-300">
                Ile druga osoba ma oddać zadłużenia? (w PLN)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="np. 30.00"
                {...form.register("customOwedPLN", { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.customOwedPLN && <p className="text-xs text-red-500">{errors.customOwedPLN.message}</p>}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            Zapisz wydatek
          </button>

        </form>
      </div>
    </div>
  );
}
