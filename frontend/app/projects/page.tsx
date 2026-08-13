"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { ArrowLeft, CalendarDays, Camera, FolderKanban, GripVertical, Pencil, Plus, ReceiptText, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api, getApiBaseUrl } from "@/lib/api";
import type { ProjectDTO, ProjectExpenseDTO } from "@/lib/types";

type ProjectDraft = { name: string; description: string; budgetPLN: string };
type ExpenseDraft = { description: string; amountPLN: string; expenseDate: string; imageUrls: string[] };
type ExpenseContext = { projectId: number; expense?: ProjectExpenseDTO };

const emptyProject: ProjectDraft = { name: "", description: "", budgetPLN: "" };
const newExpense = (): ExpenseDraft => ({
  description: "",
  amountPLN: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  imageUrls: [],
});

const money = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [projectDraft, setProjectDraft] = useState<ProjectDraft | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectDTO | null>(null);
  const [expenseContext, setExpenseContext] = useState<ExpenseContext | null>(null);
  const [draggedProjectId, setDraggedProjectId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "project"; project: ProjectDTO } | { type: "expense"; projectId: number; expense: ProjectExpenseDTO } | null>(null);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setProjects(await api.get("/api/projects"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się pobrać projektów");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProjects(); }, []);
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;

  const saveProject = async (draft: ProjectDraft, id?: number) => {
    const payload = { name: draft.name, description: draft.description, budgetPLN: Number(draft.budgetPLN) };
    try {
      if (id) await api.put(`/api/projects/${id}`, payload);
      else await api.post("/api/projects", payload);
      setProjectDraft(null);
      setEditingProject(null);
      await loadProjects();
      toast.success(id ? "Projekt zaktualizowany" : "Projekt utworzony");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się zapisać projektu");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "project") {
        await api.delete(`/api/projects/${deleteTarget.project.id}`);
        if (selectedProjectId === deleteTarget.project.id) setSelectedProjectId(null);
      } else {
        await api.delete(`/api/projects/${deleteTarget.projectId}/expenses/${deleteTarget.expense.id}`);
      }
      setDeleteTarget(null);
      await loadProjects();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się usunąć pozycji");
    }
  };

  const reorderProjects = async (targetId: number) => {
    if (draggedProjectId == null || draggedProjectId === targetId) return;
    const sourceIndex = projects.findIndex((project) => project.id === draggedProjectId);
    const targetIndex = projects.findIndex((project) => project.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const ordered = [...projects];
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);
    setProjects(ordered);
    setDraggedProjectId(null);
    try {
      await api.put("/api/projects/order", { projectIds: ordered.map((project) => project.id) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się zapisać kolejności projektów");
      await loadProjects();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-5 dark:border-stone-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {selectedProject ? (
            <button onClick={() => setSelectedProjectId(null)} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              <ArrowLeft className="h-4 w-4" /> Wszystkie projekty
            </button>
          ) : <p className="app-page-title">Budżety celowe</p>}
          <h1 className="mt-2 text-3xl font-bold text-stone-900 dark:text-white">{selectedProject?.name ?? "Projekty"}</h1>
          {selectedProject && <p className="mt-1 text-stone-500 dark:text-stone-400">{selectedProject.description || "Wydatki i rachunki przypisane do projektu."}</p>}
        </div>
        <button onClick={() => selectedProject ? router.push(`/expenses/new?projectId=${selectedProject.id}`) : setProjectDraft({ ...emptyProject })} className="inline-flex items-center justify-center gap-2 rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
          {selectedProject ? <><Plus className="h-4 w-4" /> Dodaj wydatek</> : <><FolderKanban className="h-4 w-4" /> Nowy projekt</>}
        </button>
      </div>

      {loading ? (
        <div className="h-44 animate-pulse border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900" />
      ) : selectedProject ? (
        <ProjectDetails
          project={selectedProject}
          onEditProject={() => setEditingProject(selectedProject)}
          onDeleteProject={() => setDeleteTarget({ type: "project", project: selectedProject })}
          onAddExpense={() => router.push(`/expenses/new?projectId=${selectedProject.id}`)}
          onEditExpense={(expense) => setExpenseContext({ projectId: selectedProject.id, expense })}
          onDeleteExpense={(expense) => setDeleteTarget({ type: "expense", projectId: selectedProject.id, expense })}
        />
      ) : projects.length === 0 ? (
        <div className="border border-dashed border-stone-300 py-16 text-center dark:border-stone-700">
          <FolderKanban className="mx-auto h-9 w-9 text-stone-400" />
          <p className="mt-3 font-semibold text-stone-900 dark:text-white">Nie ma jeszcze projektów</p>
          <p className="mt-1 text-sm text-stone-500">Utwórz pierwszy projekt i ustaw jego budżet.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => <ProjectPreview key={project.id} project={project} onOpen={() => setSelectedProjectId(project.id)} onEdit={() => setEditingProject(project)} onDelete={() => setDeleteTarget({ type: "project", project })} onDragStart={() => setDraggedProjectId(project.id)} onDropTarget={reorderProjects} dragging={draggedProjectId === project.id} />)}
        </div>
      )}

      {projectDraft && <ProjectDialog title="Nowy projekt" draft={projectDraft} onChange={setProjectDraft} onClose={() => setProjectDraft(null)} onSave={(draft) => saveProject(draft)} />}
      {editingProject && <ProjectDialog title="Edytuj projekt" draft={{ name: editingProject.name, description: editingProject.description ?? "", budgetPLN: String(editingProject.budgetPLN) }} onChange={(draft) => setEditingProject({ ...editingProject, name: draft.name, description: draft.description, budgetPLN: Number(draft.budgetPLN) })} onClose={() => setEditingProject(null)} onSave={(draft) => saveProject(draft, editingProject.id)} />}
      {expenseContext && <ExpenseDialog context={expenseContext} onClose={() => setExpenseContext(null)} onSaved={async () => { setExpenseContext(null); await loadProjects(); }} />}
      {deleteTarget && <ConfirmDialog
        title={deleteTarget.type === "project" ? "Usunąć projekt?" : "Usunąć wydatek?"}
        message={deleteTarget.type === "project" ? `Projekt „${deleteTarget.project.name}” wraz ze wszystkimi wydatkami zostanie usunięty.` : `Wydatek „${deleteTarget.expense.description}” zostanie usunięty.`}
        onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete}
      />}
    </div>
  );
}

function ProjectPreview({ project, onOpen, onEdit, onDelete, onDragStart, onDropTarget, dragging }: { project: ProjectDTO; onOpen: () => void; onEdit: () => void; onDelete: () => void; onDragStart: () => void; onDropTarget: (targetId: number) => void; dragging: boolean }) {
  const percent = project.budgetPLN > 0 ? project.spentPLN / project.budgetPLN * 100 : 0;
  const holdTimer = useRef<number | null>(null);
  const [touchDragging, setTouchDragging] = useState(false);
  const clearHold = () => { if (holdTimer.current) window.clearTimeout(holdTimer.current); holdTimer.current = null; };
  const finishTouchDrag = (event: React.PointerEvent) => {
    clearHold();
    if (!touchDragging) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-project-id]");
    const targetId = Number(target?.dataset.projectId);
    if (targetId) onDropTarget(targetId);
    setTouchDragging(false);
  };
  return (
    <article data-project-id={project.id} draggable onDragStart={onDragStart} onDragOver={(event) => event.preventDefault()} onDrop={() => onDropTarget(project.id)} className={`group border border-stone-200 bg-white p-4 transition-colors hover:border-indigo-300 dark:border-stone-800 dark:bg-stone-900 ${dragging || touchDragging ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <button type="button" aria-label="Przytrzymaj i przeciągnij projekt" className="touch-drag-handle mt-0.5 shrink-0" onPointerDown={(event) => { if (event.pointerType === "touch") { event.currentTarget.setPointerCapture(event.pointerId); clearHold(); holdTimer.current = window.setTimeout(() => { onDragStart(); setTouchDragging(true); }, 280); } }} onPointerUp={finishTouchDrag} onPointerCancel={() => { clearHold(); setTouchDragging(false); }}><GripVertical className="h-5 w-5" /></button>
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <h2 className="truncate font-bold text-stone-900 dark:text-white">{project.name}</h2>
          {project.description && <p className="mt-1 line-clamp-2 text-sm text-stone-500 dark:text-stone-400">{project.description}</p>}
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"><div className={`h-full rounded-full ${percent > 100 ? "bg-red-500" : "bg-indigo-600"}`} style={{ width: `${Math.min(percent, 100)}%` }} /></div>
          <p className="mt-2 text-xs font-semibold text-stone-500">{money.format(project.spentPLN)} z {money.format(project.budgetPLN)} · {project.expenses.length} wydatków</p>
        </button>
        <div className="flex gap-1"><IconButton label="Edytuj projekt" onClick={onEdit}><Pencil /></IconButton><IconButton label="Usuń projekt" onClick={onDelete}><Trash2 /></IconButton></div>
      </div>
    </article>
  );
}

function ProjectDetails({ project, onEditProject, onDeleteProject, onAddExpense, onEditExpense, onDeleteExpense }: { project: ProjectDTO; onEditProject: () => void; onDeleteProject: () => void; onAddExpense: () => void; onEditExpense: (expense: ProjectExpenseDTO) => void; onDeleteExpense: (expense: ProjectExpenseDTO) => void }) {
  const percent = project.budgetPLN > 0 ? project.spentPLN / project.budgetPLN * 100 : 0;
  const remaining = project.budgetPLN - project.spentPLN;
  return (
    <section className="border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="project-budget-panel grid gap-5 border-b border-stone-200 p-4 dark:border-stone-800 sm:grid-cols-[180px_1fr] sm:items-center sm:p-6">
        <BudgetDonut percent={percent} />
        <div>
          <div className="flex items-start justify-between gap-3"><div><p className="surface-heading">Budżet projektu</p><p className="mt-2 text-2xl font-bold text-stone-900 dark:text-white">{money.format(project.budgetPLN)}</p></div><div className="flex gap-1"><IconButton label="Edytuj projekt" onClick={onEditProject}><Pencil /></IconButton><IconButton label="Usuń projekt" onClick={onDeleteProject}><Trash2 /></IconButton></div></div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-950"><p className="text-xs font-semibold text-stone-500">Wydano</p><p className="mt-1 font-bold text-stone-900 dark:text-white">{money.format(project.spentPLN)}</p></div>
            <div className="border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-950"><p className="text-xs font-semibold text-stone-500">{remaining >= 0 ? "Pozostało" : "Ponad budżet"}</p><p className={`mt-1 font-bold ${remaining < 0 ? "text-red-600" : "text-emerald-600"}`}>{money.format(Math.abs(remaining))}</p></div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-800"><div><p className="font-bold text-stone-900 dark:text-white">Wydatki</p><p className="text-xs text-stone-500">{project.expenses.length} pozycji</p></div><button onClick={onAddExpense} className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"><Plus className="h-4 w-4" /> Dodaj</button></div>
      <div className="project-expense-scroll max-h-[48dvh] overflow-y-auto overscroll-contain">
        {project.expenses.length === 0 ? <div className="px-4 py-12 text-center"><ReceiptText className="mx-auto h-8 w-8 text-stone-400" /><p className="mt-3 font-semibold text-stone-900 dark:text-white">Brak wydatków</p><p className="mt-1 text-sm text-stone-500">Dodaj pierwszy rachunek do tego projektu.</p></div> : project.expenses.map((expense) => <ExpenseRow key={`${expense.source}-${expense.id}`} expense={expense} onEdit={expense.source === "PROJECT_EXPENSE" ? () => onEditExpense(expense) : undefined} onDelete={expense.source === "PROJECT_EXPENSE" ? () => onDeleteExpense(expense) : undefined} />)}
      </div>
    </section>
  );
}

function BudgetDonut({ percent }: { percent: number }) {
  const shown = Math.min(Math.max(percent, 0), 100);
  const color = percent > 100 ? "#ef4444" : "var(--project-donut-progress)";
  return <div className="project-budget-donut mx-auto flex h-40 w-40 items-center justify-center rounded-full" style={{ background: `conic-gradient(${color} ${shown * 3.6}deg, var(--project-donut-track) 0deg)` }} role="img" aria-label={`Wykorzystano ${Math.round(percent)} procent budżetu`}><div className="project-budget-donut-center flex h-28 w-28 flex-col items-center justify-center rounded-full"><span className={`text-2xl font-bold ${percent > 100 ? "text-red-600" : "text-stone-900 dark:text-white"}`}>{Math.round(percent)}%</span><span className="text-xs font-semibold text-stone-500">budżetu</span></div></div>;
}

function ExpenseRow({ expense, onEdit, onDelete }: { expense: ProjectExpenseDTO; onEdit?: () => void; onDelete?: () => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  return <article className="shopping-list-item flex gap-3 p-4 hover:bg-stone-50 dark:hover:bg-stone-950">
    <div className="flex min-w-0 flex-1 gap-3">
      {expense.imageUrls.length > 0 ? <button onClick={() => setPreviewUrl(expense.imageUrls[0])} className="relative h-14 w-14 shrink-0 overflow-hidden border border-stone-200 bg-stone-50 dark:border-stone-800"><img src={imageSrc(expense.imageUrls[0])} alt="Rachunek" className="h-full w-full object-cover" />{expense.imageUrls.length > 1 && <span className="absolute bottom-0 right-0 bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">+{expense.imageUrls.length - 1}</span>}</button> : <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-950"><ReceiptText className="h-5 w-5 text-stone-400" /></div>}
      <div className="min-w-0"><p className="font-semibold text-stone-900 dark:text-white">{expense.description}</p><p className="mt-1 text-lg font-bold text-indigo-600 dark:text-indigo-400">{money.format(expense.amountPLN)}</p><p className="mt-1 inline-flex items-center gap-1 text-xs text-stone-500"><CalendarDays className="h-3 w-3" /> {new Date(`${expense.expenseDate}T12:00:00`).toLocaleDateString("pl-PL")}</p>{expense.source === "EXPENSE" && <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">Zwykły wydatek — uwzględniony w rozliczeniach</p>}</div>
    </div>
    {onEdit && onDelete && <div className="flex gap-1"><IconButton label="Edytuj wydatek" onClick={onEdit}><Pencil /></IconButton><IconButton label="Usuń wydatek" onClick={onDelete}><Trash2 /></IconButton></div>}
    {previewUrl && createPortal(<ImageViewer urls={expense.imageUrls} initialUrl={previewUrl} onClose={() => setPreviewUrl(null)} />, document.body)}
  </article>;
}

function ProjectDialog({ title, draft, onChange, onClose, onSave }: { title: string; draft: ProjectDraft; onChange: (draft: ProjectDraft) => void; onClose: () => void; onSave: (draft: ProjectDraft) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!draft.name.trim() || Number(draft.budgetPLN) <= 0) return; setSaving(true); await onSave(draft); setSaving(false); };
  return <Dialog title={title} onClose={onClose}><form onSubmit={submit} className="grid gap-4"><Field label="Nazwa projektu"><input autoFocus required maxLength={120} value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} placeholder="np. Remont mieszkania" /></Field><Field label="Planowany budżet (PLN)"><input required type="number" min="0.01" step="0.01" value={draft.budgetPLN} onChange={(event) => onChange({ ...draft, budgetPLN: event.target.value })} placeholder="30000,00" /></Field><Field label="Opis (opcjonalnie)"><textarea maxLength={1000} value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} placeholder="Zakres projektu, termin lub dodatkowe informacje" /></Field><DialogActions onClose={onClose} saving={saving} /></form></Dialog>;
}

function ExpenseDialog({ context, onClose, onSaved }: { context: ExpenseContext; onClose: () => void; onSaved: () => Promise<void> }) {
  const existing = context.expense;
  const [draft, setDraft] = useState<ExpenseDraft>(existing ? { description: existing.description, amountPLN: String(existing.amountPLN), expenseDate: existing.expenseDate, imageUrls: existing.imageUrls } : newExpense());
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.description.trim() || Number(draft.amountPLN) <= 0) return;
    setSaving(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const data = new FormData(); data.append("file", file);
        const response = await api.postFormData("/api/projects/images", data) as { receiptUrl: string };
        uploaded.push(response.receiptUrl);
      }
      const payload = { description: draft.description, amountPLN: Number(draft.amountPLN), expenseDate: draft.expenseDate, imageUrls: [...draft.imageUrls, ...uploaded] };
      if (existing) await api.put(`/api/projects/${context.projectId}/expenses/${existing.id}`, payload);
      else await api.post(`/api/projects/${context.projectId}/expenses`, payload);
      toast.success(existing ? "Wydatek zaktualizowany" : "Wydatek dodany");
      await onSaved();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Nie udało się zapisać wydatku"); }
    finally { setSaving(false); }
  };
  return <Dialog title={existing ? "Edytuj wydatek" : "Nowy wydatek"} onClose={onClose}><form onSubmit={submit} className="grid gap-4"><Field label="Opis"><input autoFocus required maxLength={200} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="np. Farba i grunt" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Kwota (PLN)"><input required type="number" min="0.01" step="0.01" value={draft.amountPLN} onChange={(event) => setDraft({ ...draft, amountPLN: event.target.value })} placeholder="0,00" /></Field><Field label="Data"><input required type="date" value={draft.expenseDate} onChange={(event) => setDraft({ ...draft, expenseDate: event.target.value })} /></Field></div><Field label="Zdjęcia rachunków"><input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 10 - draft.imageUrls.length))} /><button type="button" onClick={() => inputRef.current?.click()} className="flex items-center justify-center gap-2 border border-dashed border-stone-300 bg-stone-50 px-4 py-4 text-sm font-semibold text-stone-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-300"><Camera className="h-5 w-5" /> {files.length > 0 ? `Wybrano: ${files.length}` : "Dodaj zdjęcie lub zdjęcia"}</button></Field>{draft.imageUrls.length > 0 && <div className="flex flex-wrap gap-2">{draft.imageUrls.map((url) => <div key={url} className="relative h-16 w-16 overflow-hidden border border-stone-200"><img src={imageSrc(url)} alt="Rachunek" className="h-full w-full object-cover" /><button type="button" aria-label="Usuń zdjęcie" onClick={() => setDraft({ ...draft, imageUrls: draft.imageUrls.filter((entry) => entry !== url) })} className="absolute right-0 top-0 bg-black/70 p-1 text-white"><X className="h-3 w-3" /></button></div>)}</div>}<DialogActions onClose={onClose} saving={saving} /></form></Dialog>;
}

function ImageViewer({ urls, initialUrl, onClose }: { urls: string[]; initialUrl: string; onClose: () => void }) {
  const [active, setActive] = useState(initialUrl);
  return <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" onClick={onClose}><button type="button" onClick={onClose} className="absolute right-4 top-4 p-2 text-white" aria-label="Zamknij"><X /></button><img src={imageSrc(active)} alt="Zdjęcie rachunku" className="max-h-[75dvh] max-w-full object-contain" onClick={(event) => event.stopPropagation()} />{urls.length > 1 && <div className="mt-4 flex max-w-full gap-2 overflow-x-auto" onClick={(event) => event.stopPropagation()}>{urls.map((url) => <button key={url} onClick={() => setActive(url)} className={`h-14 w-14 shrink-0 overflow-hidden border-2 ${active === url ? "border-white" : "border-transparent opacity-60"}`}><img src={imageSrc(url)} alt="Miniatura rachunku" className="h-full w-full object-cover" /></button>)}</div>}</div>;
}

function imageSrc(url: string) { return url.startsWith("/") ? `${getApiBaseUrl()}${url}` : url; }
function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) { return <button type="button" title={label} aria-label={label} onClick={onClick} className="flex h-9 w-9 items-center justify-center rounded text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-white [&>svg]:h-4 [&>svg]:w-4">{children}</button>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-2 text-sm font-medium text-stone-700 dark:text-stone-300"><span>{label}</span>{children}</label>; }
function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return createPortal(<div className="fixed inset-0 z-[70] flex items-end bg-black/50 sm:items-center sm:justify-center sm:p-4" onMouseDown={onClose}><div className="app-dialog-surface shopping-list-dialog max-h-[92dvh] w-full max-w-lg overflow-y-auto border border-stone-200 bg-white p-5 shadow-xl dark:border-stone-800 dark:bg-stone-900" onMouseDown={(event) => event.stopPropagation()}><div className="mb-5 flex items-center justify-between"><h2 className="font-bold text-stone-900 dark:text-white">{title}</h2><IconButton label="Zamknij" onClick={onClose}><X /></IconButton></div>{children}</div></div>, document.body); }
function DialogActions({ onClose, saving }: { onClose: () => void; saving: boolean }) { return <div className="flex justify-end gap-2 border-t border-stone-200 pt-4 dark:border-stone-800"><button type="button" onClick={onClose} className="px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">Anuluj</button><button type="submit" disabled={saving} className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? "Zapisywanie..." : "Zapisz"}</button></div>; }
function ConfirmDialog({ title, message, onClose, onConfirm }: { title: string; message: string; onClose: () => void; onConfirm: () => Promise<void> }) { const [saving, setSaving] = useState(false); return <Dialog title={title} onClose={onClose}><p className="text-sm text-stone-500 dark:text-stone-400">{message}</p><div className="mt-6 flex justify-end gap-2 border-t border-stone-200 pt-4 dark:border-stone-800"><button type="button" onClick={onClose} className="px-3 py-2 text-sm font-medium text-stone-600">Anuluj</button><button type="button" disabled={saving} onClick={async () => { setSaving(true); await onConfirm(); setSaving(false); }} className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Usuwanie..." : "Usuń"}</button></div></Dialog>; }
