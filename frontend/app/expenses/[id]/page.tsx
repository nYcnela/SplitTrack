"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, ExternalLink, Loader2, ReceiptText, Save, X } from "lucide-react";
import { toast } from "sonner";
import { api, getApiBaseUrl } from "@/lib/api";
import type { ExpenseDTO, Person, ProjectDTO, SettlementMode } from "@/lib/types";
import { AppSelect } from "@/components/AppSelect";

type ExpenseDraft = {
  expenseDate: string;
  description: string;
  payer: Person;
  settlementMode: SettlementMode;
  customOwedPLN: string;
  inputCurrency: string;
  inputAmount: string;
  exchangeRateToPLN: string;
  projectId: string;
  imageUrls: string[];
};

const MAX_IMAGES = 10;
const CONTROL_CLASS = "w-full rounded border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 hover:border-stone-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 dark:hover:border-stone-600 dark:focus:border-indigo-500 dark:focus:bg-stone-950 dark:disabled:bg-stone-800 dark:disabled:text-stone-500";

export default function ExpenseDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const expenseId = Number(params.id);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<ExpenseDraft | null>(null);
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      setLoadError("Nieprawidłowy identyfikator wydatku");
      setLoading(false);
      return;
    }
    Promise.all([
      api.get(`/api/expenses/${expenseId}`) as Promise<ExpenseDTO>,
      api.get("/api/projects") as Promise<ProjectDTO[]>,
    ])
      .then(([expense, projectList]) => {
        setDraft(toDraft(expense));
        setProjects(projectList);
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : "Nie udało się pobrać wydatku"))
      .finally(() => setLoading(false));
  }, [expenseId]);

  const selectFiles = (selected: File[]) => {
    if (!draft) return;
    const available = MAX_IMAGES - draft.imageUrls.length - files.length;
    const accepted = selected.slice(0, Math.max(available, 0));
    if (accepted.length < selected.length) toast.error(`Możesz dodać maksymalnie ${MAX_IMAGES} zdjęć`);
    setFiles((current) => [...current, ...accepted]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft || saving) return;
    const amount = Number(draft.inputAmount);
    const exchangeRate = Number(draft.exchangeRateToPLN);
    const customOwed = Number(draft.customOwedPLN);
    if (!draft.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Podaj opis i prawidłową kwotę");
      return;
    }
    if (draft.inputCurrency !== "PLN" && (!Number.isFinite(exchangeRate) || exchangeRate <= 0)) {
      toast.error("Podaj prawidłowy kurs waluty");
      return;
    }
    if (draft.settlementMode === "CUSTOM" && (!Number.isFinite(customOwed) || customOwed <= 0)) {
      toast.error("Podaj kwotę rozliczenia niestandardowego");
      return;
    }

    try {
      setSaving(true);
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const data = new FormData();
        data.append("file", file);
        const response = await api.postFormData("/api/expenses/receipt", data) as { receiptUrl?: string };
        if (response.receiptUrl) uploadedUrls.push(response.receiptUrl);
      }
      const imageUrls = [...draft.imageUrls, ...uploadedUrls];
      const updated = await api.put(`/api/expenses/${expenseId}`, {
        expenseDate: draft.expenseDate,
        description: draft.description.trim(),
        payer: draft.payer,
        settlementMode: draft.settlementMode,
        customOwedPLN: draft.settlementMode === "CUSTOM" ? customOwed : null,
        inputCurrency: draft.inputCurrency.trim().toUpperCase(),
        inputAmount: amount,
        exchangeRateToPLN: draft.inputCurrency === "PLN" ? 1 : exchangeRate,
        receiptUrl: serializeReceiptUrls(imageUrls),
        projectId: draft.projectId ? Number(draft.projectId) : null,
        newProject: null,
      }) as ExpenseDTO;
      setDraft(toDraft(updated));
      setFiles([]);
      toast.success("Wydatek został zaktualizowany");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się zapisać wydatku");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-stone-100 dark:bg-stone-900" />;
  if (loadError || !draft) return <div className="space-y-4"><Link href="/expenses" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400"><ArrowLeft className="h-4 w-4" /> Wróć do wydatków</Link><div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{loadError ?? "Nie znaleziono wydatku"}</div></div>;

  return (
    <div
      className="min-h-[calc(100vh-8rem)] px-0 py-2 sm:px-4 sm:py-5"
      onClick={() => router.push("/expenses")}
      aria-label="Wróć do wydatków"
    >
      <article
        className="app-dialog-surface mx-auto max-w-3xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-900/5 dark:border-stone-800 dark:bg-stone-900 dark:shadow-black/20"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-stone-200 bg-stone-50/80 p-5 dark:border-stone-800 dark:bg-stone-950/50 sm:p-6">
          <div className="flex min-w-0 gap-4">
            <div className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300 sm:flex">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div>
              <p className="app-page-title">Wydatek #{expenseId}</p>
              <h1 className="mt-2 text-2xl font-bold text-stone-900 dark:text-white sm:text-3xl">Edytuj wydatek</h1>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Zmień dane oraz dodaj lub usuń zdjęcia rachunku.</p>
            </div>
          </div>
          <Link href="/expenses" aria-label="Wróć do wydatków" title="Wróć do wydatków" className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:bg-stone-100 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-white"><ArrowLeft className="h-5 w-5" /></Link>
        </header>

      <form onSubmit={save} className="space-y-7 p-5 sm:p-6">
        <section className="space-y-4">
          <div><h2 className="surface-heading">Podstawowe informacje</h2><p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Data, opis i przypisanie wydatku.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Data wydatku"><input className={CONTROL_CLASS} required type="date" value={draft.expenseDate} onChange={(event) => setDraft({ ...draft, expenseDate: event.target.value })} /></Field>
          <Field label="Projekt"><AppSelect ariaLabel="Projekt" value={draft.projectId} onChange={(projectId) => setDraft({ ...draft, projectId })} options={[{ value: "", label: "Bez projektu" }, ...projects.map((project) => ({ value: String(project.id), label: project.name }))]} /></Field>
        </div>
        <Field label="Przedmiot"><input className={CONTROL_CLASS} required maxLength={200} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></Field>
        </section>

        <section className="space-y-4 border-t border-stone-200 pt-6 dark:border-stone-800">
          <div><h2 className="surface-heading">Rozliczenie</h2><p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Płatnik, sposób podziału i wartość transakcji.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Płacący"><AppSelect ariaLabel="Płacący" value={draft.payer} onChange={(payer) => setDraft({ ...draft, payer: payer as Person })} options={[{ value: "MACIEK", label: "Maciek" }, { value: "EMILKA", label: "Emilka" }]} /></Field>
          <Field label="Sposób rozliczenia"><AppSelect ariaLabel="Sposób rozliczenia" value={draft.settlementMode} onChange={(settlementMode) => setDraft({ ...draft, settlementMode: settlementMode as SettlementMode })} options={[{ value: "NOT_SETTLED", label: "Bez rozliczania" }, { value: "HALF", label: "Na pół" }, { value: "FULL", label: "Całość" }, { value: "CUSTOM", label: "Kwota niestandardowa" }]} /></Field>
        </div>
        {draft.settlementMode === "CUSTOM" && <Field label="Kwota należna drugiej osobie (PLN)"><input className={CONTROL_CLASS} required type="number" min="0.01" step="0.01" value={draft.customOwedPLN} onChange={(event) => setDraft({ ...draft, customOwedPLN: event.target.value })} /></Field>}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Kwota"><input className={CONTROL_CLASS} required type="number" min="0.01" step="0.01" value={draft.inputAmount} onChange={(event) => setDraft({ ...draft, inputAmount: event.target.value })} /></Field>
          <Field label="Waluta"><input className={CONTROL_CLASS} required minLength={3} maxLength={5} value={draft.inputCurrency} onChange={(event) => setDraft({ ...draft, inputCurrency: event.target.value.toUpperCase() })} /></Field>
          <Field label="Kurs do PLN"><input className={CONTROL_CLASS} required={draft.inputCurrency !== "PLN"} disabled={draft.inputCurrency === "PLN"} type="number" min="0.000001" step="0.000001" value={draft.inputCurrency === "PLN" ? "1" : draft.exchangeRateToPLN} onChange={(event) => setDraft({ ...draft, exchangeRateToPLN: event.target.value })} /></Field>
        </div>
        </section>

        <section className="space-y-4 border-t border-stone-200 pt-6 dark:border-stone-800">
          <div className="flex items-center justify-between gap-3"><div><h2 className="surface-heading">Zdjęcia rachunku</h2><p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{draft.imageUrls.length + files.length} z {MAX_IMAGES} zdjęć</p></div><input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={(event) => selectFiles(Array.from(event.target.files ?? []))} /><button type="button" disabled={draft.imageUrls.length + files.length >= MAX_IMAGES} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-indigo-400 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/30"><Camera className="h-4 w-4" /> Dodaj zdjęcia</button></div>
          {draft.imageUrls.length === 0 && files.length === 0 ? <div className="rounded-xl border border-dashed border-stone-300 py-8 text-center text-sm text-stone-500 dark:border-stone-700">Ten wydatek nie ma zdjęć.</div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{draft.imageUrls.map((url, index) => <div key={`${url}-${index}`} className="relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-950"><a href={imageSrc(url)} target="_blank" rel="noreferrer" className="block h-full w-full"><img src={imageSrc(url)} alt={`Rachunek ${index + 1}`} className="h-full w-full object-cover" /><span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-1 text-xs text-white"><ExternalLink className="h-3 w-3" /></span></a><button type="button" title="Usuń zdjęcie z wydatku" onClick={() => setDraft({ ...draft, imageUrls: draft.imageUrls.filter((_, itemIndex) => itemIndex !== index) })} className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-red-600"><X className="h-4 w-4" /></button></div>)}{files.map((file, index) => <div key={`${file.name}-${file.lastModified}-${index}`} className="relative flex aspect-square items-center justify-center rounded-xl border border-dashed border-indigo-300 bg-indigo-50 p-3 text-center text-xs font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300"><span className="break-all">{file.name}</span><button type="button" title="Usuń wybrane zdjęcie" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-red-600"><X className="h-4 w-4" /></button></div>)}</div>}
          <p className="text-xs text-stone-500">Usunięcie miniatury odłącza zdjęcie od tego wydatku po zapisaniu zmian. Plik źródłowy nie jest kasowany automatycznie.</p>
        </section>

        <div className="flex flex-col-reverse gap-3 border-t border-stone-200 pt-6 dark:border-stone-800 sm:flex-row sm:justify-end"><Link href="/expenses" className="inline-flex items-center justify-center rounded border border-stone-200 px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white">Anuluj</Link><button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? "Zapisywanie..." : "Zapisz zmiany"}</button></div>
      </form>
      </article>
    </div>
  );
}

function toDraft(expense: ExpenseDTO): ExpenseDraft {
  return {
    expenseDate: expense.expenseDate,
    description: expense.description,
    payer: expense.payer,
    settlementMode: expense.settlementMode,
    customOwedPLN: expense.customOwedPLN == null ? "" : String(expense.customOwedPLN),
    inputCurrency: expense.originalCurrency,
    inputAmount: String(expense.originalAmount),
    exchangeRateToPLN: String(expense.exchangeRateToPLN),
    projectId: expense.projectId == null ? "" : String(expense.projectId),
    imageUrls: parseReceiptUrls(expense.receiptUrl),
  };
}

function parseReceiptUrls(receiptUrl?: string | null): string[] {
  if (!receiptUrl?.trim()) return [];
  const normalized = receiptUrl.trim();
  if (!normalized.startsWith("[")) return [normalized];
  try {
    const parsed: unknown = JSON.parse(normalized);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0) : [];
  } catch {
    return [];
  }
}

function serializeReceiptUrls(urls: string[]): string | null {
  if (urls.length === 0) return null;
  return urls.length === 1 ? urls[0] : JSON.stringify(urls);
}

function imageSrc(url: string): string {
  return url.startsWith("/") ? `${getApiBaseUrl()}${url}` : url;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-medium text-stone-700 dark:text-stone-300"><span>{label}</span>{children}</label>;
}
