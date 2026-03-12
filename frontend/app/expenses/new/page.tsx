"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/lib/api";
import type { ReceiptOcrItem, ReceiptOcrResponse } from "@/lib/types";
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

const OCR_SKIP_FRAGMENTS = [
  "suma",
  "suma ptu",
  "podsuma",
  "subtotal",
  "ptu",
  "vat",
  "tax",
  "sprzedaz opodatkowana",
  "paragon",
  "fiskalny",
  "niefiskalny",
  "karta",
  "gotowka",
  "blik",
  "rabat",
  "opust",
  "terminal",
  "rozliczenie",
];

export default function NewExpensePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrItems, setOcrItems] = useState<ReceiptOcrItem[]>([]);
  const [ocrRawLines, setOcrRawLines] = useState<string[]>([]);
  const [ocrRequested, setOcrRequested] = useState(false);
  const [selectedOcrItemKeys, setSelectedOcrItemKeys] = useState<string[]>([]);
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
  const visibleOcrItems = ocrItems.filter((item) => !shouldHideOcrItem(item));
  const selectedOcrItemKeySet = new Set(selectedOcrItemKeys);
  const selectedOcrItems = visibleOcrItems.filter((item, index) => selectedOcrItemKeySet.has(getOcrItemKey(item, index)));
  const selectedOcrAmount = selectedOcrItems.reduce((sum, item) => sum + item.amount, 0);

  function getOcrItemKey(item: ReceiptOcrItem, index: number) {
    return `${index}:${item.name}:${item.amount}`;
  }

  function normalizeOcrLabel(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9%]+/g, " ")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function shouldHideOcrItem(item: ReceiptOcrItem) {
    const normalized = normalizeOcrLabel(item.name);
    return OCR_SKIP_FRAGMENTS.some((fragment) => normalized.includes(fragment));
  }

  function resetOcrState() {
    setOcrError(null);
    setOcrItems([]);
    setOcrRawLines([]);
    setOcrRequested(false);
    setSelectedOcrItemKeys([]);
  }

  async function runReceiptOcr(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    setOcrLoading(true);
    setOcrRequested(true);
    setOcrError(null);
    setOcrItems([]);
    setOcrRawLines([]);
    setSelectedOcrItemKeys([]);

    try {
      const response = await api.postFormData("/api/expenses/receipt/ocr", formData) as ReceiptOcrResponse;
      const items = (response.items ?? []).filter((item) => !shouldHideOcrItem(item));
      const rawLines = response.rawLines ?? [];
      setOcrItems(items);
      setOcrRawLines(rawLines);
      setSelectedOcrItemKeys(items.map((item, index) => getOcrItemKey(item, index)));

      if (items.length === 0) {
        toast.info(rawLines.length > 0
          ? "OCR odczytał tekst, ale nie złożył z niego pozycji zakupowych"
          : "OCR nie zwrócił czytelnego tekstu z tego zdjęcia");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Nie udało się odczytać paragonu";
      setOcrError(message);
      toast.error(message);
    } finally {
      setOcrLoading(false);
    }
  }

  function applySelectedOcrAmount() {
    form.setValue("inputAmount", Number(selectedOcrAmount.toFixed(2)), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    toast.success("Wstawiono sumę zaznaczonych pozycji do kwoty");
  }

  function toggleOcrItem(item: ReceiptOcrItem, index: number) {
    const key = getOcrItemKey(item, index);
    setSelectedOcrItemKeys((prev) =>
      prev.includes(key) ? prev.filter((entry) => entry !== key) : [...prev, key]
    );
  }

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
                resetOcrState();
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
                    resetOcrState();
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
              Dozwolone formaty: JPG, PNG, WEBP, GIF (max 10 MB). Dla analizy OCR najpewniej dzialaja JPG i PNG.
            </p>
          </div>

          {receiptFile && !ocrRequested && (
            <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 dark:border-stone-800 theme-e:border-pink-200 bg-stone-50/70 dark:bg-stone-950/70 theme-e:bg-white/90 theme-e:shadow-sm p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-200">
                  OCR paragonu
                </h2>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  Jeśli chcesz, możesz przeanalizować paragon i zaznaczyć tylko wybrane pozycje do jednego wydatku.
                </p>
              </div>
              <button
                type="button"
                onClick={() => receiptFile && runReceiptOcr(receiptFile)}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                Analizuj paragon
              </button>
            </div>
          )}

          {receiptFile && ocrRequested && (
            <div className="space-y-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/70 theme-e:border-pink-200 theme-e:bg-white/90 theme-e:shadow-sm p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-200">
                    Pozycje z paragonu
                  </h2>
                  <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                    Zaznacz pozycje, które mają wejść do jednego wydatku. Suma zaktualizuje się na żywo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => receiptFile && runReceiptOcr(receiptFile)}
                  disabled={ocrLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-stone-800 theme-e:border-pink-200 px-3 py-2 text-sm font-medium text-stone-700 dark:text-stone-200 theme-e:text-[#6f5361] hover:bg-white dark:hover:bg-stone-900 theme-e:hover:bg-pink-50 transition-colors disabled:opacity-60"
                >
                  {ocrLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Skanuj ponownie
                </button>
              </div>

              {ocrLoading && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/80 dark:border-indigo-900/50 dark:bg-indigo-950/30 px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300 theme-e:border-pink-200 theme-e:bg-pink-50 theme-e:text-fuchsia-600">
                  Trwa analiza paragonu przez OCR...
                </div>
              )}

              {!ocrLoading && ocrError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {ocrError}
                </div>
              )}

              {!ocrLoading && !ocrError && visibleOcrItems.length > 0 && (
                <>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {visibleOcrItems.map((item, index) => {
                      const key = getOcrItemKey(item, index);
                      const checked = selectedOcrItemKeySet.has(key);

                      return (
                        <label
                          key={key}
                          className={`flex items-start gap-3 rounded-xl border px-3 py-3 transition-colors cursor-pointer ${
                            checked
                              ? "border-indigo-300 bg-indigo-50/80 dark:border-indigo-800 dark:bg-indigo-950/30 theme-e:border-pink-300 theme-e:bg-pink-100/80"
                              : "border-stone-200 bg-white/80 dark:border-stone-800 dark:bg-stone-900/50 theme-e:border-pink-200 theme-e:bg-white"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOcrItem(item, index)}
                            className="mt-1 h-4 w-4 rounded border-stone-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-stone-900 dark:text-white">
                              {item.name}
                            </div>
                          </div>
                          <div className="whitespace-nowrap text-sm font-semibold text-stone-900 dark:text-white">
                            {item.amount.toFixed(2)} zł
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/70 theme-e:border-pink-200 theme-e:bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <div className="text-sm font-medium text-stone-900 dark:text-white">
                        Zaznaczone pozycje: {selectedOcrItems.length} / {visibleOcrItems.length}
                      </div>
                      <div className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                        Ta suma może zostać wpisana do pola kwoty dla jednego wydatku.
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        Suma zaznaczonych
                      </div>
                      <div className="mt-1 text-2xl font-black text-stone-900 dark:text-white">
                        {selectedOcrAmount.toFixed(2)} zł
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setSelectedOcrItemKeys(visibleOcrItems.map((item, index) => getOcrItemKey(item, index)))}
                      className="rounded-xl border border-stone-200 dark:border-stone-800 theme-e:border-pink-200 px-3 py-2 text-sm font-medium text-stone-700 dark:text-stone-200 theme-e:text-[#6f5361] hover:bg-white dark:hover:bg-stone-900 theme-e:hover:bg-pink-50 transition-colors"
                    >
                      Zaznacz wszystko
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedOcrItemKeys([])}
                      className="rounded-xl border border-stone-200 dark:border-stone-800 theme-e:border-pink-200 px-3 py-2 text-sm font-medium text-stone-700 dark:text-stone-200 theme-e:text-[#6f5361] hover:bg-white dark:hover:bg-stone-900 theme-e:hover:bg-pink-50 transition-colors"
                    >
                      Wyczyść zaznaczenie
                    </button>
                    <button
                      type="button"
                      onClick={applySelectedOcrAmount}
                      disabled={selectedOcrItems.length === 0}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
                    >
                      Użyj sumy zaznaczonych
                    </button>
                  </div>
                </>
              )}

              {!ocrLoading && !ocrError && visibleOcrItems.length === 0 && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                    {ocrRawLines.length > 0
                      ? "OCR odczytał tekst, ale nie udało się automatycznie złożyć pozycji zakupowych. Poniżej masz surowe linie z OCR do szybkiego sprawdzenia."
                      : "OCR nie zwrócił czytelnego tekstu z tego zdjęcia. Spróbuj ująć cały paragon, zrobić bardziej płaskie zdjęcie albo zeskanować ponownie."}
                  </div>

                  {ocrRawLines.length > 0 && (
                    <details className="rounded-xl border border-stone-200 dark:border-stone-800 theme-e:border-pink-200 bg-white/70 dark:bg-stone-900/50 theme-e:bg-white p-4">
                      <summary className="cursor-pointer text-sm font-medium text-stone-900 dark:text-white">
                        Pokaż surowe linie OCR ({ocrRawLines.length})
                      </summary>
                      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                        {ocrRawLines.map((line, index) => (
                          <div
                            key={`${index}-${line}`}
                            className="rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 px-3 py-2 text-xs text-stone-600 dark:text-stone-300"
                          >
                            {line}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}

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
