"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/lib/api";
import type { Person, ProjectDTO, ReceiptOcrItem, ReceiptOcrResponse, SettlementMode } from "@/lib/types";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Check, ChevronDown, Loader2, Pencil, Split, Upload, User, X } from "lucide-react";
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
type AssignmentTarget = "HALF" | Person;
type ScannerMode = "STANDARD" | AssignmentTarget;
type ReceiptAnalyzerMode = "light" | "heavy";
type NewProjectPayload = { name: string; description: string; budgetPLN: number };

interface EditableReceiptItem {
  id: string;
  name: string;
  amount: number;
  rawLine: string;
  quantity?: number | null;
  weight?: number | null;
  price?: number | null;
  discount?: number | null;
  totalPrice: number;
  priceWithDiscount: number;
}

const assignmentLabels: Record<AssignmentTarget, string> = {
  HALF: "Na pół",
  MACIEK: "Maciek",
  EMILKA: "Emilka",
};

const assignmentTextClasses: Record<AssignmentTarget, string> = {
  HALF: "text-emerald-600 dark:text-emerald-300",
  MACIEK: "text-indigo-600 dark:text-indigo-300",
  EMILKA: "text-pink-600 dark:text-pink-300",
};

const analyzerModeLabels: Record<ReceiptAnalyzerMode, string> = {
  light: "Light",
  heavy: "Heavy",
};

const settlementModeDetails: Record<SettlementMode, { label: string; description: string }> = {
  HALF: { label: "Na pół", description: "Koszty dzielone są po równo (50/50)." },
  NOT_SETTLED: { label: "Bez rozliczania", description: "Wydatek nie wpływa na saldo końcowe, tylko śledzimy koszt." },
  FULL: { label: "Druga osoba oddaje całość", description: "Do oddania jest 100% kwoty." },
  CUSTOM: { label: "Własna kwota", description: "Druga osoba ma oddać konkretną kwotę." },
};

const MAX_RECEIPT_IMAGE_SIDE = 2_000;
const CLIENT_OPTIMIZATION_THRESHOLD_BYTES = 1_000_000;

export default function NewExpensePage() {
  const router = useRouter();
  const receiptInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrItems, setOcrItems] = useState<EditableReceiptItem[]>([]);
  const [ocrRawLines, setOcrRawLines] = useState<string[]>([]);
  const [ocrRequested, setOcrRequested] = useState(false);
  const [receiptMeta, setReceiptMeta] = useState<{ storeName?: string | null; total?: number | null; currency?: string | null }>({});
  const [selectedOcrItemIds, setSelectedOcrItemIds] = useState<string[]>([]);
  const [scannerMode, setScannerMode] = useState<ScannerMode>("STANDARD");
  const [receiptAnalyzerMode, setReceiptAnalyzerMode] = useState<ReceiptAnalyzerMode>("light");
  const [assignments, setAssignments] = useState<Record<string, AssignmentTarget>>({});
  const [expandedOcrItemIds, setExpandedOcrItemIds] = useState<string[]>([]);
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("projectId") ?? ""
  );
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectBudget, setNewProjectBudget] = useState("");

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

  useEffect(() => {
    api.get("/api/projects")
      .then((response) => setProjects(response as ProjectDTO[]))
      .catch((error) => toast.error(error instanceof Error ? error.message : "Nie udało się pobrać projektów"))
      .finally(() => setProjectsLoading(false));
  }, []);

  const selectedOcrItemSet = useMemo(() => new Set(selectedOcrItemIds), [selectedOcrItemIds]);
  const selectedOcrItems = ocrItems.filter((item) => selectedOcrItemSet.has(item.id));
  const selectedOcrAmount = sumItems(selectedOcrItems);
  const hasReceiptFiles = receiptFiles.length > 0;
  const receiptFilesLabel = hasReceiptFiles
    ? receiptFiles.length === 1
      ? receiptFiles[0].name
      : `${receiptFiles.length} zdjęcia`
    : "Nie wybrano pliku";
  const assignmentGroups = useMemo(() => {
    return {
      HALF: ocrItems.filter((item) => assignments[item.id] === "HALF"),
      MACIEK: ocrItems.filter((item) => assignments[item.id] === "MACIEK"),
      EMILKA: ocrItems.filter((item) => assignments[item.id] === "EMILKA"),
    };
  }, [assignments, ocrItems]);
  const assignedCount = Object.keys(assignments).length;
  const hasRecognizedReceiptItems = ocrRequested && !ocrLoading && !ocrError && ocrItems.length > 0;

  function resetOcrState() {
    setOcrError(null);
    setOcrItems([]);
    setOcrRawLines([]);
    setOcrRequested(false);
    setReceiptMeta({});
    setSelectedOcrItemIds([]);
    setAssignments({});
    setScannerMode("STANDARD");
    setExpandedOcrItemIds([]);
  }

  async function runReceiptOcr(files: File[]) {
    setOcrLoading(true);
    setOcrRequested(true);
    setOcrError(null);
    setOcrItems([]);
    setOcrRawLines([]);
    setSelectedOcrItemIds([]);
    setAssignments({});
    setExpandedOcrItemIds([]);

    try {
      const optimizedFiles = await optimizeReceiptFiles(files);
      const formData = new FormData();
      optimizedFiles.forEach((file) => formData.append("files", file));
      formData.append("llmType", receiptAnalyzerMode);

      const response = await api.postFormData("/api/expenses/receipt/ocr", formData) as ReceiptOcrResponse;
      const items = (response.items ?? []).map(toEditableReceiptItem);
      setOcrItems(items);
      setOcrRawLines(response.rawLines ?? []);
      setReceiptMeta({
        storeName: response.establishment,
        total: response.total,
        currency: response.currency,
      });
      setSelectedOcrItemIds(items.map((item) => item.id));

      if (response.establishment && !form.getValues("description")) {
        form.setValue("description", `Zakupy ${response.establishment}`, { shouldDirty: true });
      }

      if (items.length === 0) {
        toast.info("Analizator nie zwrócił pozycji zakupowych dla tego zdjęcia");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Nie udało się przeanalizować paragonu";
      setOcrError(message);
      toast.error(message);
    } finally {
      setOcrLoading(false);
    }
  }

  function toEditableReceiptItem(item: ReceiptOcrItem, index: number): EditableReceiptItem {
    const totalPrice = numberOrFallback(item.totalPrice, item.amount);
    const priceWithDiscount = numberOrFallback(item.priceWithDiscount, item.amount);
    return {
      id: `${index}-${item.name}-${item.amount}`,
      name: item.name || "Pozycja",
      amount: priceWithDiscount,
      rawLine: item.rawLine ?? item.name ?? "",
      quantity: item.quantity,
      weight: item.weight,
      price: item.price,
      discount: item.discount,
      totalPrice,
      priceWithDiscount,
    };
  }

  function updateOcrItem(id: string, changes: Partial<Pick<EditableReceiptItem, "name" | "totalPrice" | "priceWithDiscount">>) {
    setOcrItems((prev) => prev.map((item) => {
      if (item.id !== id) {
        return item;
      }
      const next = { ...item, ...changes };
      return {
        ...next,
        amount: normalizeAmount(next.priceWithDiscount),
      };
    }));
  }

  function toggleOcrItemEditor(id: string) {
    setExpandedOcrItemIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]
    );
  }

  function toggleOcrItem(item: EditableReceiptItem) {
    if (scannerMode !== "STANDARD") {
      setAssignments((prev) => {
        const current = prev[item.id];
        const next = { ...prev };
        if (current === scannerMode) {
          delete next[item.id];
        } else {
          next[item.id] = scannerMode;
        }
        return next;
      });
      return;
    }

    setSelectedOcrItemIds((prev) =>
      prev.includes(item.id) ? prev.filter((entry) => entry !== item.id) : [...prev, item.id]
    );
  }

  function assignSelected(target: AssignmentTarget) {
    setAssignments((prev) => {
      const next = { ...prev };
      selectedOcrItems.forEach((item) => {
        next[item.id] = target;
      });
      return next;
    });
    toast.success(`Przypisano zaznaczone pozycje: ${assignmentLabels[target]}`);
  }

  function clearAssignmentsFor(target?: AssignmentTarget) {
    setAssignments((prev) => {
      if (!target) {
        return {};
      }
      const next = { ...prev };
      Object.entries(next).forEach(([id, assignedTarget]) => {
        if (assignedTarget === target) {
          delete next[id];
        }
      });
      return next;
    });
  }

  function applySelectedOcrAmount() {
    form.setValue("inputAmount", Number(selectedOcrAmount.toFixed(2)), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    toast.success("Wstawiono sumę zaznaczonych pozycji do kwoty");
  }

  async function uploadReceiptIfNeeded() {
    if (receiptFiles.length === 0) {
      return null;
    }
    const optimizedFiles = await optimizeReceiptFiles(receiptFiles);
    const uploadedUrls = await Promise.all(optimizedFiles.map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      const uploadResponse = await api.postFormData("/api/expenses/receipt", formData) as { receiptUrl?: string };
      return uploadResponse.receiptUrl ?? null;
    }));
    const receiptUrls = uploadedUrls.filter((url): url is string => Boolean(url));
    if (receiptUrls.length === 0) {
      return null;
    }
    return receiptUrls.length === 1 ? receiptUrls[0] : JSON.stringify(receiptUrls);
  }

  function getNewProjectPayload(): NewProjectPayload | null | undefined {
    if (!creatingProject) return null;
    const budgetPLN = Number(newProjectBudget);
    if (!newProjectName.trim() || !Number.isFinite(budgetPLN) || budgetPLN <= 0) {
      toast.error("Podaj nazwę i dodatni budżet nowego projektu");
      return undefined;
    }
    return { name: newProjectName.trim(), description: "", budgetPLN };
  }

  function selectedProjectIdOrNull() {
    const projectId = Number(selectedProjectId);
    return Number.isInteger(projectId) && projectId > 0 ? projectId : null;
  }

  function buildExpensePayload(data: ExpenseFormValues, receiptUrl: string | null, projectId?: number | null, newProject?: NewProjectPayload | null) {
    return {
      ...data,
      exchangeRateToPLN: data.inputCurrency === "PLN" ? 1.0 : data.exchangeRateToPLN,
      customOwedPLN: data.settlementMode === "CUSTOM" ? data.customOwedPLN : null,
      receiptUrl,
      projectId: projectId ?? null,
      newProject: newProject ?? null,
    };
  }

  const onSubmit = async (data: ExpenseFormValues) => {
    const newProject = getNewProjectPayload();
    if (newProject === undefined) return;
    try {
      setLoading(true);
      const receiptUrl = await uploadReceiptIfNeeded();
      await api.post("/api/expenses", buildExpensePayload(data, receiptUrl, selectedProjectIdOrNull(), newProject));
      toast.success("Dodano wydatek");
      router.push("/expenses");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd dodawania wydatku");
    } finally {
      setLoading(false);
    }
  };

  async function saveAssignedExpenses() {
    const baseData = form.getValues();
    const validGroups = (Object.entries(assignmentGroups) as [AssignmentTarget, EditableReceiptItem[]][])
      .filter(([, items]) => items.length > 0);

    if (validGroups.length === 0) {
      toast.error("Najpierw przypisz pozycje z paragonu");
      return;
    }

    const newProject = getNewProjectPayload();
    if (newProject === undefined) return;

    try {
      setLoading(true);
      const receiptUrl = await uploadReceiptIfNeeded();
      let projectId = selectedProjectIdOrNull();
      let projectToCreate: NewProjectPayload | null = newProject;
      for (const [target, items] of validGroups) {
        const amount = sumItems(items);
        const saved = await api.post("/api/expenses", {
          expenseDate: baseData.expenseDate,
          description: buildGroupDescription(target, items),
          payer: baseData.payer,
          settlementMode: settlementModeForAssignment(baseData.payer, target),
          customOwedPLN: null,
          inputCurrency: "PLN",
          inputAmount: amount,
          exchangeRateToPLN: 1.0,
          receiptUrl,
          projectId,
          newProject: projectToCreate,
        }) as { projectId?: number | null };
        projectId = saved.projectId ?? projectId;
        projectToCreate = null;
      }
      toast.success(`Dodano wydatki z paragonu: ${validGroups.length}`);
      router.push("/expenses");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd zapisu przypisanych wydatków");
    } finally {
      setLoading(false);
    }
  }

  function buildGroupDescription(target: AssignmentTarget, items: EditableReceiptItem[]) {
    const base = receiptMeta.storeName ? `Zakupy ${receiptMeta.storeName}` : form.getValues("description") || "Zakupy z paragonu";
    const suffix = target === "HALF" ? "na pół" : `dla ${assignmentLabels[target]}`;
    const itemLabel = items.length <= 2 ? `: ${items.map((item) => item.name).join(", ")}` : ` (${items.length} poz.)`;
    return `${base} - ${suffix}${itemLabel}`.slice(0, 200);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <p className="app-page-title">Nowy wpis</p>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white mt-2">Dodaj wydatek</h1>
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
                {(["MACIEK", "EMILKA"] as Person[]).map((person) => (
                  <label className="flex-1" key={person}>
                    <input type="radio" value={person} {...form.register("payer")} className="peer sr-only" />
                    <div className="text-center px-4 py-1.5 text-sm font-medium rounded-lg cursor-pointer peer-checked:bg-white dark:peer-checked:bg-stone-800 peer-checked:text-indigo-600 dark:peer-checked:text-indigo-400 peer-checked:shadow-sm text-stone-500 hover:text-stone-900 transition-all">
                      {assignmentLabels[person]}
                    </div>
                  </label>
                ))}
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

          <div className="space-y-3 border-t border-stone-100 pt-5 dark:border-stone-800">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Projekt (opcjonalnie)</label>
              {!creatingProject && <button type="button" onClick={() => { setSelectedProjectId(""); setCreatingProject(true); }} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">+ Nowy projekt</button>}
            </div>
            {!creatingProject ? (
              <select
                value={selectedProjectId}
                disabled={projectsLoading}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 dark:border-stone-800 dark:bg-stone-950 dark:text-white"
              >
                <option value="">Bez projektu</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            ) : (
              <div className="grid gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-stone-900 dark:text-white">Nowy projekt</p><button type="button" onClick={() => setCreatingProject(false)} className="text-sm text-stone-500 hover:text-stone-900 dark:hover:text-white">Anuluj</button></div>
                <input value={newProjectName} maxLength={120} onChange={(event) => setNewProjectName(event.target.value)} placeholder="Nazwa, np. Remont łazienki" className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-stone-800 dark:bg-stone-950 dark:text-white" />
                <input type="number" min="0.01" step="0.01" value={newProjectBudget} onChange={(event) => setNewProjectBudget(event.target.value)} placeholder="Budżet projektu (PLN)" className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-stone-800 dark:bg-stone-950 dark:text-white" />
                <p className="text-xs text-stone-500 dark:text-stone-400">Projekt i wydatek zostaną zapisane razem. Ten wydatek nadal trafi do zwykłej ewidencji i rozliczeń.</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Paragon (opcjonalnie)</label>
            <input
              ref={receiptInputRef}
              id="receipt-file"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setReceiptFiles(files);
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
                {hasReceiptFiles ? "Zmień zdjęcia" : "Wybierz zdjęcia"}
              </button>
              <span className="flex-1 min-w-0 truncate text-sm text-stone-600 dark:text-stone-300">
                {receiptFilesLabel}
              </span>
              {hasReceiptFiles && (
                <button
                  type="button"
                  onClick={() => {
                    setReceiptFiles([]);
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
          </div>

          {hasReceiptFiles && !ocrRequested && (
            <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 dark:border-stone-800 theme-e:border-pink-200 bg-stone-50/70 dark:bg-stone-950/70 theme-e:bg-white/90 theme-e:shadow-sm p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-200">
                  Analiza paragonu
                </h2>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  Jeden skan pozwoli uzupełnić kwotę albo przypisać pozycje do kilku rozliczeń.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:items-end">
                <AnalyzerModeSwitch value={receiptAnalyzerMode} onChange={setReceiptAnalyzerMode} />
                <button
                  type="button"
                  onClick={() => runReceiptOcr(receiptFiles)}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  Analizuj paragon
                </button>
              </div>
            </div>
          )}

          {hasReceiptFiles && ocrRequested && (
            <section className="space-y-4 border-t border-stone-200 pt-5 dark:border-stone-800 theme-e:border-pink-200">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-200">
                    Pozycje z paragonu
                  </h2>
                  <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                    Edytuj błędne odczyty, a potem użyj sumy albo przypisz pozycje do osób.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <AnalyzerModeSwitch value={receiptAnalyzerMode} onChange={setReceiptAnalyzerMode} disabled={ocrLoading} />
                  <button
                    type="button"
                    onClick={() => runReceiptOcr(receiptFiles)}
                    disabled={ocrLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-stone-800 theme-e:border-pink-200 px-3 py-2 text-sm font-medium text-stone-700 dark:text-stone-200 theme-e:text-[#6f5361] hover:bg-white dark:hover:bg-stone-900 theme-e:hover:bg-pink-50 transition-colors disabled:opacity-60"
                  >
                    {ocrLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Skanuj ponownie
                  </button>
                </div>
              </div>

              {receiptMeta.storeName || receiptMeta.total ? (
                <div className="grid grid-cols-1 gap-1 border-y border-stone-200 py-3 text-sm dark:border-stone-800 sm:grid-cols-2 sm:gap-2">
                  <div className="text-stone-600 dark:text-stone-300">
                    Sklep: <span className="font-semibold text-stone-900 dark:text-white">{receiptMeta.storeName ?? "brak"}</span>
                  </div>
                  <div className="text-stone-600 dark:text-stone-300 sm:text-right">
                    Suma paragonu: <span className="font-semibold text-stone-900 dark:text-white">{formatMoney(receiptMeta.total ?? 0)} {receiptMeta.currency ?? "PLN"}</span>
                  </div>
                </div>
              ) : null}

              {ocrLoading && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/80 dark:border-indigo-900/50 dark:bg-indigo-950/30 px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300 theme-e:border-pink-200 theme-e:bg-pink-50 theme-e:text-fuchsia-600">
                  Trwa analiza paragonu...
                </div>
              )}

              {!ocrLoading && ocrError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {ocrError}
                </div>
              )}

              {!ocrLoading && !ocrError && ocrItems.length > 0 && (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {([
                      ["STANDARD", "Zaznaczanie", Check],
                      ["HALF", "Na pół", Split],
                      ["MACIEK", "Maciek", User],
                      ["EMILKA", "Emilka", User],
                    ] as const).map(([mode, label, Icon]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setScannerMode(mode)}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                          scannerMode === mode
                            ? "border-indigo-500 bg-indigo-600 text-white"
                            : "border-stone-200 bg-white/80 text-stone-700 hover:bg-white dark:border-stone-800 dark:bg-stone-900/70 dark:text-stone-200 dark:hover:bg-stone-900"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
                    {ocrItems.map((item) => {
                      const selected = selectedOcrItemSet.has(item.id);
                      const assignedTarget = assignments[item.id];
                      const activeAssigned = scannerMode !== "STANDARD" && assignedTarget === scannerMode;
                      const editorExpanded = expandedOcrItemIds.includes(item.id);

                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleOcrItem(item)}
                          className={`rounded border px-3 py-2.5 transition-colors sm:px-3 ${
                            assignedTarget
                              ? "border-indigo-300 bg-indigo-50/80 dark:border-indigo-800 dark:bg-indigo-950/30"
                              : selected
                                ? "border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-900"
                              : "border-stone-200 bg-white/80 dark:border-stone-800 dark:bg-stone-900/50"
                          } cursor-pointer`}
                        >
                          <div className="flex items-start gap-2 sm:gap-3">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleOcrItem(item);
                              }}
                              className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-bold transition-colors sm:h-7 sm:w-7 ${
                                scannerMode === "STANDARD"
                                  ? selected
                                    ? "border-indigo-600 bg-indigo-600 text-white"
                                    : "border-stone-300 bg-white text-transparent dark:border-stone-700 dark:bg-stone-950"
                                  : activeAssigned
                                    ? "border-indigo-600 bg-indigo-600 text-white"
                                    : "border-stone-300 bg-white text-stone-400 dark:border-stone-700 dark:bg-stone-950"
                              }`}
                              aria-label="Zaznacz pozycję"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
                              <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:items-start">
                                <div className="relative min-w-0 flex-1">
                                  <input
                                    value={item.name}
                                    onChange={(event) => updateOcrItem(item.id, { name: event.target.value })}
                                    onClick={(event) => event.stopPropagation()}
                                    className="w-full rounded border border-transparent bg-transparent px-1 py-1 text-sm font-medium text-stone-900 focus:border-indigo-500 focus:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white dark:focus:bg-stone-950"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleOcrItemEditor(item.id);
                                  }}
                                  className={`flex h-10 w-10 items-center justify-center rounded-lg border text-stone-500 transition-colors sm:hidden ${
                                    editorExpanded
                                      ? "border-indigo-500 bg-indigo-600 text-white"
                                      : "border-stone-200 bg-stone-50 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-300 dark:hover:bg-stone-900"
                                  }`}
                                  aria-label={editorExpanded ? "Ukryj edycję pozycji" : "Edytuj ceny pozycji"}
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <div className="col-span-2 text-left sm:col-span-1 sm:text-right">
                                  <div className="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400">
                                    Do rozliczenia
                                  </div>
                                  <div className="text-lg font-black text-stone-900 dark:text-white">
                                    {formatMoney(item.priceWithDiscount)} zł
                                  </div>
                                </div>
                              </div>
                              <div className={`${editorExpanded ? "grid" : "hidden"} grid-cols-1 gap-2 sm:grid sm:grid-cols-2`}>
                                <label className="space-y-1">
                                  <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Cena przed obniżką</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={numberInputValue(item.totalPrice)}
                                    onChange={(event) => updateOcrItem(item.id, { totalPrice: normalizeAmount(event.target.valueAsNumber) })}
                                    onClick={(event) => event.stopPropagation()}
                                    className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-stone-800 dark:bg-stone-950 dark:text-white"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Cena po obniżce</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={numberInputValue(item.priceWithDiscount)}
                                    onChange={(event) => updateOcrItem(item.id, { priceWithDiscount: normalizeAmount(event.target.valueAsNumber) })}
                                    onClick={(event) => event.stopPropagation()}
                                    className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-stone-800 dark:bg-stone-950 dark:text-white"
                                  />
                                </label>
                              </div>
                              <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                                {item.quantity ? <span>Ilość: {item.quantity}</span> : null}
                                {item.weight ? <span>Waga: {item.weight} kg</span> : null}
                                {item.discount ? <span>Rabat: {formatMoney(item.discount)} zł</span> : null}
                                {assignedTarget ? (
                                  <span className={`font-semibold ${assignmentTextClasses[assignedTarget]}`}>
                                    Przypisano: {assignmentLabels[assignedTarget]}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid gap-3 border-t border-stone-200 pt-4 dark:border-stone-800 theme-e:border-pink-200 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <div className="text-sm font-medium text-stone-900 dark:text-white">
                        Zaznaczone: {selectedOcrItems.length} / {ocrItems.length} · Przypisane: {assignedCount} / {ocrItems.length}
                      </div>
                      <div className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                        Na pół: {formatMoney(sumItems(assignmentGroups.HALF))} zł · Maciek: {formatMoney(sumItems(assignmentGroups.MACIEK))} zł · Emilka: {formatMoney(sumItems(assignmentGroups.EMILKA))} zł
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        Suma zaznaczonych
                      </div>
                      <div className="mt-1 text-2xl font-black text-stone-900 dark:text-white">
                        {formatMoney(selectedOcrAmount)} zł
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedOcrItemIds(ocrItems.map((item) => item.id))}
                      className="rounded-xl border border-stone-200 dark:border-stone-800 theme-e:border-pink-200 px-3 py-2 text-sm font-medium text-stone-700 dark:text-stone-200 theme-e:text-[#6f5361] hover:bg-white dark:hover:bg-stone-900 theme-e:hover:bg-pink-50 transition-colors"
                    >
                      Zaznacz wszystko
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedOcrItemIds([])}
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
                    <button
                      type="button"
                      onClick={() => assignSelected("HALF")}
                      disabled={selectedOcrItems.length === 0}
                      className="rounded-xl border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
                    >
                      Zaznaczone na pół
                    </button>
                    <button
                      type="button"
                      onClick={() => assignSelected("MACIEK")}
                      disabled={selectedOcrItems.length === 0}
                      className="rounded-xl border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
                    >
                      Zaznaczone Maciek
                    </button>
                    <button
                      type="button"
                      onClick={() => assignSelected("EMILKA")}
                      disabled={selectedOcrItems.length === 0}
                      className="rounded-xl border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
                    >
                      Zaznaczone Emilka
                    </button>
                    <button
                      type="button"
                      onClick={() => clearAssignmentsFor()}
                      disabled={assignedCount === 0}
                      className="rounded-xl border border-stone-200 dark:border-stone-800 px-3 py-2 text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-white dark:hover:bg-stone-900 transition-colors disabled:opacity-60"
                    >
                      Wyczyść przypisania
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={saveAssignedExpenses}
                    disabled={loading || assignedCount === 0}
                    className="w-full rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-stone-950 dark:hover:bg-stone-200"
                  >
                    Zapisz przypisane wydatki z paragonu
                  </button>
                </>
              )}

              {!ocrLoading && !ocrError && ocrItems.length === 0 && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                    Analizator nie zwrócił pozycji zakupowych. Spróbuj zeskanować ponownie albo wpisz wydatek ręcznie.
                  </div>
                  {ocrRawLines.length > 0 && (
                    <details className="rounded-xl border border-stone-200 dark:border-stone-800 theme-e:border-pink-200 bg-white/70 dark:bg-stone-900/50 theme-e:bg-white p-4">
                      <summary className="cursor-pointer text-sm font-medium text-stone-900 dark:text-white">
                        Pokaż surowe linie ({ocrRawLines.length})
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
            </section>
          )}

          {!hasRecognizedReceiptItems && (
            <>
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
                  <CompactSelect
                    value={currency}
                    options={["PLN", "EUR", "USD", "GBP", "CZK"].map((value) => ({ value, label: value }))}
                    onChange={(value) => form.setValue("inputCurrency", value, { shouldDirty: true, shouldValidate: true })}
                    ariaLabel="Waluta"
                  />
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
                <CompactSelect
                  value={settlementMode}
                  options={(Object.entries(settlementModeDetails) as [SettlementMode, { label: string }][]).map(([value, detail]) => ({ value, label: detail.label }))}
                  onChange={(value) => form.setValue("settlementMode", value as SettlementMode, { shouldDirty: true, shouldValidate: true })}
                  ariaLabel="Tryb rozliczenia"
                />
                <p className="border-l-2 border-indigo-500 pl-3 text-sm text-stone-500 dark:text-stone-400 theme-e:border-pink-400">
                  {settlementModeDetails[settlementMode].description}
                </p>
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
            </>
          )}
        </form>
      </div>
    </div>
  );
}

async function optimizeReceiptFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map(optimizeReceiptFile));
}

async function optimizeReceiptFile(file: File): Promise<File> {
  if (
    file.size <= CLIENT_OPTIMIZATION_THRESHOLD_BYTES
    || !file.type.startsWith("image/")
    || typeof createImageBitmap !== "function"
  ) {
    return file;
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_RECEIPT_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }

    context.fillStyle = "white";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    const compressed = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.85);
    });
    if (!compressed || compressed.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^/.]+$/, "") || "paragon";
    return new File([compressed], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    // Keep the original file if the browser cannot decode its format.
    return file;
  } finally {
    bitmap?.close();
  }
}

function AnalyzerModeSwitch({
  value,
  onChange,
  disabled = false,
}: {
  value: ReceiptAnalyzerMode;
  onChange: (value: ReceiptAnalyzerMode) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex w-full rounded-xl border border-stone-200 bg-white p-1 dark:border-stone-800 dark:bg-stone-950 sm:w-auto">
      {(["light", "heavy"] as ReceiptAnalyzerMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          disabled={disabled}
          className={`flex-1 rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors sm:flex-none ${
            value === mode
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-900"
          } disabled:opacity-60`}
        >
          {analyzerModeLabels[mode]}
        </button>
      ))}
    </div>
  );
}

function CompactSelect({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            event.currentTarget.blur();
          }
        }}
        aria-label={ariaLabel}
        aria-expanded={open}
        className="flex min-h-10 w-full items-center justify-between rounded border border-stone-200 bg-stone-50 px-4 py-2 text-left text-sm font-medium text-stone-900 shadow-sm transition-colors hover:border-stone-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-stone-800 dark:bg-stone-950 dark:text-white dark:hover:border-stone-700 theme-e:text-[#4a3840]"
      >
        <span>{selected.label}</span>
        <ChevronDown className={`h-4 w-4 text-stone-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="app-menu-surface absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 overflow-hidden rounded border border-stone-300 bg-white p-1 shadow-lg dark:border-stone-700 dark:bg-stone-900 theme-e:border-pink-200 theme-e:bg-white">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-indigo-600 text-white theme-e:bg-pink-500"
                    : "text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800 theme-e:text-[#4a3840] theme-e:hover:bg-pink-50"
                }`}
              >
                {option.label}
                {isSelected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function settlementModeForAssignment(payer: Person, target: AssignmentTarget): SettlementMode {
  if (target === "HALF") {
    return "HALF";
  }
  return payer === target ? "NOT_SETTLED" : "FULL";
}

function sumItems(items: EditableReceiptItem[]) {
  return Number(items.reduce((sum, item) => sum + normalizeAmount(item.priceWithDiscount), 0).toFixed(2));
}

function numberOrFallback(value: number | null | undefined, fallback: number | null | undefined) {
  return normalizeAmount(value ?? fallback ?? 0);
}

function normalizeAmount(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(Number(value).toFixed(2)) : 0;
}

function numberInputValue(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function formatMoney(value: number) {
  return normalizeAmount(value).toFixed(2);
}
