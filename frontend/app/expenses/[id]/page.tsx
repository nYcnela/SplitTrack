"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, ExternalLink, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { api, getApiBaseUrl } from "@/lib/api";
import type { ExpenseDTO, Person, ProjectDTO, SettlementMode } from "@/lib/types";

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

export default function ExpenseDetailsPage({ params }: { params: { id: string } }) {
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="border-b border-stone-200 pb-5 dark:border-stone-800">
        <Link href="/expenses" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400"><ArrowLeft className="h-4 w-4" /> Wróć do wydatków</Link>
        <p className="app-page-title mt-5">Wydatek #{expenseId}</p>
        <h1 className="mt-2 text-3xl font-bold text-stone-900 dark:text-white">Edytuj wydatek</h1>
        <p className="mt-1 text-stone-500 dark:text-stone-400">Zmień dane oraz dodaj lub usuń zdjęcia rachunku.</p>
      </div>

      <form onSubmit={save} className="space-y-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Data wydatku"><input required type="date" value={draft.expenseDate} onChange={(event) => setDraft({ ...draft, expenseDate: event.target.value })} /></Field>
          <Field label="Projekt"><select value={draft.projectId} onChange={(event) => setDraft({ ...draft, projectId: event.target.value })}><option value="">Bez projektu</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
        </div>
        <Field label="Przedmiot"><input required maxLength={200} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Płacący"><select value={draft.payer} onChange={(event) => setDraft({ ...draft, payer: event.target.value as Person })}><option value="MACIEK">Maciek</option><option value="EMILKA">Emilka</option></select></Field>
          <Field label="Sposób rozliczenia"><select value={draft.settlementMode} onChange={(event) => setDraft({ ...draft, settlementMode: event.target.value as SettlementMode })}><option value="NOT_SETTLED">Bez rozliczania</option><option value="HALF">Na pół</option><option value="FULL">Całość</option><option value="CUSTOM">Kwota niestandardowa</option></select></Field>
        </div>
        {draft.settlementMode === "CUSTOM" && <Field label="Kwota należna drugiej osobie (PLN)"><input required type="number" min="0.01" step="0.01" value={draft.customOwedPLN} onChange={(event) => setDraft({ ...draft, customOwedPLN: event.target.value })} /></Field>}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Kwota"><input required type="number" min="0.01" step="0.01" value={draft.inputAmount} onChange={(event) => setDraft({ ...draft, inputAmount: event.target.value })} /></Field>
          <Field label="Waluta"><input required minLength={3} maxLength={5} value={draft.inputCurrency} onChange={(event) => setDraft({ ...draft, inputCurrency: event.target.value.toUpperCase() })} /></Field>
          <Field label="Kurs do PLN"><input required={draft.inputCurrency !== "PLN"} disabled={draft.inputCurrency === "PLN"} type="number" min="0.000001" step="0.000001" value={draft.inputCurrency === "PLN" ? "1" : draft.exchangeRateToPLN} onChange={(event) => setDraft({ ...draft, exchangeRateToPLN: event.target.value })} /></Field>
        </div>

        <section className="space-y-4 border-t border-stone-200 pt-5 dark:border-stone-800">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold text-stone-900 dark:text-white">Zdjęcia rachunku</h2><p className="text-sm text-stone-500">{draft.imageUrls.length + files.length} z {MAX_IMAGES}</p></div><input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={(event) => selectFiles(Array.from(event.target.files ?? []))} /><button type="button" disabled={draft.imageUrls.length + files.length >= MAX_IMAGES} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 dark:border-stone-700 dark:text-indigo-400 dark:hover:bg-indigo-950/30"><Camera className="h-4 w-4" /> Dodaj zdjęcia</button></div>
          {draft.imageUrls.length === 0 && files.length === 0 ? <div className="rounded-xl border border-dashed border-stone-300 py-8 text-center text-sm text-stone-500 dark:border-stone-700">Ten wydatek nie ma zdjęć.</div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{draft.imageUrls.map((url, index) => <div key={`${url}-${index}`} className="relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-950"><a href={imageSrc(url)} target="_blank" rel="noreferrer" className="block h-full w-full"><img src={imageSrc(url)} alt={`Rachunek ${index + 1}`} className="h-full w-full object-cover" /><span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-1 text-xs text-white"><ExternalLink className="h-3 w-3" /></span></a><button type="button" title="Usuń zdjęcie z wydatku" onClick={() => setDraft({ ...draft, imageUrls: draft.imageUrls.filter((_, itemIndex) => itemIndex !== index) })} className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-red-600"><X className="h-4 w-4" /></button></div>)}{files.map((file, index) => <div key={`${file.name}-${file.lastModified}-${index}`} className="relative flex aspect-square items-center justify-center rounded-xl border border-dashed border-indigo-300 bg-indigo-50 p-3 text-center text-xs font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300"><span className="break-all">{file.name}</span><button type="button" title="Usuń wybrane zdjęcie" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-red-600"><X className="h-4 w-4" /></button></div>)}</div>}
          <p className="text-xs text-stone-500">Usunięcie miniatury odłącza zdjęcie od tego wydatku po zapisaniu zmian. Plik źródłowy nie jest kasowany automatycznie.</p>
        </section>

        <div className="flex justify-end border-t border-stone-200 pt-5 dark:border-stone-800"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? "Zapisywanie..." : "Zapisz zmiany"}</button></div>
      </form>
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
