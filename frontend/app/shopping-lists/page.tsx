"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ExternalLink, GripVertical, ImagePlus, Link2, ListPlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api, getApiBaseUrl } from "@/lib/api";
import type { ShoppingListDTO, ShoppingListItemDTO } from "@/lib/types";

type ListDraft = { name: string; description: string };
type ItemDraft = { title: string; pricePLN: string; imageUrl: string; offerUrls: string[] };
const emptyList: ListDraft = { name: "", description: "" };
const emptyItem: ItemDraft = { title: "", pricePLN: "", imageUrl: "", offerUrls: [""] };

export default function ShoppingListsPage() {
  const [lists, setLists] = useState<ShoppingListDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [listDraft, setListDraft] = useState<ListDraft | null>(null);
  const [editingList, setEditingList] = useState<ShoppingListDTO | null>(null);
  const [itemContext, setItemContext] = useState<{ listId: number; item?: ShoppingListItemDTO } | null>(null);
  const [dragged, setDragged] = useState<{ listId: number; itemId: number } | null>(null);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "list"; list: ShoppingListDTO } | { type: "item"; listId: number; item: ShoppingListItemDTO } | null>(null);

  const loadLists = async () => {
    try { setLoading(true); setLists(await api.get("/api/shopping-lists")); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Nie udało się pobrać list"); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadLists(); }, []);

  const saveList = async (draft: ListDraft, id?: number) => {
    try {
      if (id) await api.put(`/api/shopping-lists/${id}`, draft); else await api.post("/api/shopping-lists", draft);
      setListDraft(null); setEditingList(null); await loadLists();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Nie udało się zapisać listy"); }
  };
  const deleteList = async (list: ShoppingListDTO) => {
    try { await api.delete(`/api/shopping-lists/${list.id}`); await loadLists(); } catch (error) { toast.error(error instanceof Error ? error.message : "Nie udało się usunąć listy"); }
  };
  const deleteItem = async (listId: number, itemId: number) => {
    try { await api.delete(`/api/shopping-lists/${listId}/items/${itemId}`); await loadLists(); } catch (error) { toast.error(error instanceof Error ? error.message : "Nie udało się usunąć pozycji"); }
  };
  const reorder = async (list: ShoppingListDTO, targetId: number) => {
    if (!dragged || dragged.listId !== list.id || dragged.itemId === targetId) return;
    const sourceIndex = list.items.findIndex((item) => item.id === dragged.itemId);
    const targetIndex = list.items.findIndex((item) => item.id === targetId);
    const items = [...list.items]; const [moved] = items.splice(sourceIndex, 1); items.splice(targetIndex, 0, moved);
    setLists((current) => current.map((entry) => entry.id === list.id ? { ...entry, items } : entry));
    setDragged(null);
    try { await api.put(`/api/shopping-lists/${list.id}/items/order`, { itemIds: items.map((item) => item.id) }); }
    catch { toast.error("Nie udało się zapisać kolejności"); await loadLists(); }
  };
  const selectedList = lists.find((list) => list.id === selectedListId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-5 dark:border-stone-800 sm:flex-row sm:items-end sm:justify-between">
        <div>{selectedList ? <button onClick={() => setSelectedListId(null)} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400"><ArrowLeft className="h-4 w-4" /> Wszystkie listy</button> : <p className="app-page-title">Planowanie zakupów</p>}<h1 className="mt-2 text-3xl font-bold text-stone-900 dark:text-white">{selectedList ? selectedList.name : "Listy zakupowe"}</h1>{selectedList && <p className="mt-1 text-stone-500 dark:text-stone-400">{selectedList.description || "Pozycje na tej liście."}</p>}</div>
        <button onClick={() => selectedList ? setItemContext({ listId: selectedList.id }) : setListDraft({ ...emptyList })} className="inline-flex items-center justify-center gap-2 rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">{selectedList ? <><Plus className="h-4 w-4" /> Dodaj przedmiot</> : <><ListPlus className="h-4 w-4" /> Nowa lista</>}</button>
      </div>

      {loading ? <div className="h-40 animate-pulse rounded border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900" /> : !selectedList && lists.length === 0 ? (
        <div className="border border-dashed border-stone-300 py-16 text-center dark:border-stone-700"><p className="font-semibold text-stone-900 dark:text-white">Nie ma jeszcze list zakupowych</p><p className="mt-1 text-sm text-stone-500">Utwórz pierwszą listę, aby zacząć planować.</p></div>
      ) : selectedList ? <ShoppingListCard list={selectedList} onAdd={() => setItemContext({ listId: selectedList.id })} onEditList={() => setEditingList(selectedList)} onDeleteList={() => setDeleteTarget({ type: "list", list: selectedList })} onEditItem={(item) => setItemContext({ listId: selectedList.id, item })} onDeleteItem={(item) => setDeleteTarget({ type: "item", listId: selectedList.id, item })} onDragStart={(itemId) => setDragged({ listId: selectedList.id, itemId })} onDrop={(itemId) => reorder(selectedList, itemId)} /> : <div className="grid gap-3 sm:grid-cols-2">{lists.map((list) => <ShoppingListPreview key={list.id} list={list} onOpen={() => setSelectedListId(list.id)} onEdit={() => setEditingList(list)} onDelete={() => setDeleteTarget({ type: "list", list })} />)}</div>}

      {listDraft && <ListDialog title="Nowa lista" draft={listDraft} onChange={setListDraft} onClose={() => setListDraft(null)} onSave={(draft) => saveList(draft)} />}
      {editingList && <ListDialog title="Edytuj listę" draft={{ name: editingList.name, description: editingList.description ?? "" }} onChange={(draft) => setEditingList({ ...editingList, ...draft })} onClose={() => setEditingList(null)} onSave={(draft) => saveList(draft, editingList.id)} />}
      {itemContext && <ItemDialog context={itemContext} onClose={() => setItemContext(null)} onSaved={async () => { setItemContext(null); await loadLists(); }} />}
      {deleteTarget && <ConfirmDialog title={deleteTarget.type === "list" ? "Usunąć listę?" : "Usunąć przedmiot?"} message={deleteTarget.type === "list" ? `Lista „${deleteTarget.list.name}” i wszystkie jej pozycje zostaną usunięte.` : `Pozycja „${deleteTarget.item.title}” zostanie usunięta z listy.`} onClose={() => setDeleteTarget(null)} onConfirm={async () => { if (deleteTarget.type === "list") { await deleteList(deleteTarget.list); if (selectedListId === deleteTarget.list.id) setSelectedListId(null); } else await deleteItem(deleteTarget.listId, deleteTarget.item.id); setDeleteTarget(null); }} />}
    </div>
  );
}

function ShoppingListPreview({ list, onOpen, onEdit, onDelete }: { list: ShoppingListDTO; onOpen: () => void; onEdit: () => void; onDelete: () => void }) {
  const total = list.items.reduce((sum, item) => sum + (item.pricePLN ?? 0), 0);
  return <article className="group border border-stone-200 bg-white p-4 transition-colors hover:border-indigo-300 dark:border-stone-800 dark:bg-stone-900"><div className="flex items-start justify-between gap-3"><button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left"><h2 className="truncate font-bold text-stone-900 dark:text-white">{list.name}</h2>{list.description && <p className="mt-1 line-clamp-2 text-sm text-stone-500 dark:text-stone-400">{list.description}</p>}<p className="mt-3 text-xs font-semibold text-stone-500">{list.items.length} pozycji · {total.toFixed(2)} zł</p></button><div className="flex gap-1"><IconButton label="Edytuj listę" onClick={onEdit}><Pencil /></IconButton><IconButton label="Usuń listę" onClick={onDelete}><Trash2 /></IconButton></div></div></article>;
}

function ShoppingListCard({ list, onAdd, onEditList, onDeleteList, onEditItem, onDeleteItem, onDragStart, onDrop }: { list: ShoppingListDTO; onAdd: () => void; onEditList: () => void; onDeleteList: () => void; onEditItem: (item: ShoppingListItemDTO) => void; onDeleteItem: (item: ShoppingListItemDTO) => void; onDragStart: (itemId: number) => void; onDrop: (itemId: number) => void }) {
  const total = list.items.reduce((sum, item) => sum + (item.pricePLN ?? 0), 0);
  const holdTimer = useRef<number | null>(null);
  const [touchDragging, setTouchDragging] = useState<number | null>(null);
  const clearHold = () => { if (holdTimer.current) window.clearTimeout(holdTimer.current); holdTimer.current = null; };
  const startTouchDrag = (itemId: number) => { clearHold(); holdTimer.current = window.setTimeout(() => { onDragStart(itemId); setTouchDragging(itemId); }, 280); };
  const finishTouchDrag = (event: React.PointerEvent) => { clearHold(); if (touchDragging == null) return; const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-shopping-item-id]"); const targetId = Number(target?.dataset.shoppingItemId); if (targetId) onDrop(targetId); setTouchDragging(null); };
  return (
    <section className="border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-start justify-between gap-3 border-b border-stone-200 p-4 dark:border-stone-800"><div><h2 className="font-bold text-stone-900 dark:text-white">{list.name}</h2>{list.description && <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{list.description}</p>}<p className="mt-2 text-xs font-semibold text-stone-500">{list.items.length} pozycji · {total.toFixed(2)} zł</p></div><div className="flex gap-1"><IconButton label="Edytuj listę" onClick={onEditList}><Pencil /></IconButton><IconButton label="Usuń listę" onClick={onDeleteList}><Trash2 /></IconButton></div></div>
      <div className="shopping-list-items">
        {list.items.map((item) => <article key={item.id} data-shopping-item-id={item.id} draggable onDragStart={() => onDragStart(item.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => onDrop(item.id)} className={`shopping-list-item flex gap-3 p-3 transition-colors hover:bg-stone-50 dark:hover:bg-stone-950 ${touchDragging === item.id ? "opacity-50" : ""}`}>
          <div className="mt-1 shrink-0"><button type="button" aria-label="Przytrzymaj i przeciągnij" onPointerDown={(event) => { if (event.pointerType === "touch") { event.currentTarget.setPointerCapture(event.pointerId); startTouchDrag(item.id); } }} onPointerUp={finishTouchDrag} onPointerCancel={() => { clearHold(); setTouchDragging(null); }} className="touch-drag-handle"><GripVertical className="h-5 w-5" /></button></div>
          <ItemImage item={item} /><div className="min-w-0 flex-1"><div className="font-semibold text-stone-900 dark:text-white">{item.title}</div>{item.pricePLN != null && <div className="mt-0.5 text-sm font-bold text-indigo-600 dark:text-indigo-400">{item.pricePLN.toFixed(2)} zł</div>}{item.offerUrls.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{item.offerUrls.map((url, offerIndex) => <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"><ExternalLink className="h-3 w-3" /> Oferta {offerIndex + 1}</a>)}</div>}</div>
          <div className="flex gap-1"><IconButton label="Edytuj pozycję" onClick={() => onEditItem(item)}><Pencil /></IconButton><IconButton label="Usuń pozycję" onClick={() => onDeleteItem(item)}><Trash2 /></IconButton></div>
        </article>)}
      </div>
      <div className="border-t border-stone-200 p-3 dark:border-stone-800"><button onClick={onAdd} className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"><Plus className="h-4 w-4" /> Dodaj przedmiot</button></div>
    </section>
  );
}

function ItemImage({ item }: { item: ShoppingListItemDTO }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const src = item.imageUrl?.startsWith("/") ? `${getApiBaseUrl()}${item.imageUrl}` : item.imageUrl;

  if (!src) {
    return <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded border border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-950"><ImagePlus className="h-5 w-5 text-stone-400" /></div>;
  }

  return (
    <>
      <button type="button" onClick={() => setPreviewOpen(true)} className="h-14 w-14 shrink-0 overflow-hidden rounded border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-stone-800 dark:bg-stone-950" aria-label={`Powiększ zdjęcie: ${item.title}`}>
        <img src={src} alt={item.title} className="h-full w-full object-cover" />
      </button>
      {previewOpen && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label={`Zdjęcie: ${item.title}`} onClick={() => setPreviewOpen(false)}>
          <button type="button" onClick={() => setPreviewOpen(false)} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80" aria-label="Zamknij podgląd"><X className="h-5 w-5" /></button>
          <img src={src} alt={item.title} className="max-h-[90dvh] max-w-full rounded object-contain shadow-2xl" onClick={(event) => event.stopPropagation()} />
        </div>,
        document.body
      )}
    </>
  );
}
function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) { return <button type="button" title={label} aria-label={label} onClick={onClick} className="flex h-9 w-9 items-center justify-center rounded text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-white">{children}</button>; }

function ListDialog({ title, draft, onChange, onClose, onSave }: { title: string; draft: ListDraft; onChange: (draft: ListDraft) => void; onClose: () => void; onSave: (draft: ListDraft) => void }) { return <Dialog title={title} onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(draft); }} className="space-y-4"><Field label="Nazwa"><input autoFocus required value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} /></Field><Field label="Opis (opcjonalnie)"><textarea value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} /></Field><DialogActions onClose={onClose} /></form></Dialog>; }

function ItemDialog({ context, onClose, onSaved }: { context: { listId: number; item?: ShoppingListItemDTO }; onClose: () => void; onSaved: () => Promise<void> }) { const [draft, setDraft] = useState<ItemDraft>(context.item ? { title: context.item.title, pricePLN: context.item.pricePLN?.toString() ?? "", imageUrl: context.item.imageUrl ?? "", offerUrls: context.item.offerUrls.length ? context.item.offerUrls : [""] } : { ...emptyItem }); const fileRef = useRef<HTMLInputElement>(null); const [uploading, setUploading] = useState(false); const save = async (event: FormEvent) => { event.preventDefault(); const body = { title: draft.title, pricePLN: draft.pricePLN ? Number(draft.pricePLN) : null, imageUrl: draft.imageUrl || null, offerUrls: draft.offerUrls.filter(Boolean) }; try { if (context.item) await api.put(`/api/shopping-lists/${context.listId}/items/${context.item.id}`, body); else await api.post(`/api/shopping-lists/${context.listId}/items`, body); await onSaved(); } catch (error) { toast.error(error instanceof Error ? error.message : "Nie udało się zapisać pozycji"); } }; const upload = async (file?: File) => { if (!file) return; try { setUploading(true); const data = new FormData(); data.append("file", file); const response = await api.postFormData("/api/shopping-lists/images", data); setDraft((current) => ({ ...current, imageUrl: response.receiptUrl })); } catch (error) { toast.error(error instanceof Error ? error.message : "Nie udało się wysłać zdjęcia"); } finally { setUploading(false); } }; return <Dialog title={context.item ? "Edytuj przedmiot" : "Dodaj przedmiot"} onClose={onClose}><form onSubmit={save} className="space-y-4"><Field label="Nazwa przedmiotu"><input autoFocus required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></Field><Field label="Cena (PLN, opcjonalnie)"><input type="number" min="0" step="0.01" value={draft.pricePLN} onChange={(event) => setDraft({ ...draft, pricePLN: event.target.value })} /></Field><div className="flex items-center gap-3"><input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(event) => upload(event.target.files?.[0])} /><button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded border border-stone-200 px-3 py-2 text-sm font-medium dark:border-stone-700"><ImagePlus className="h-4 w-4" /> {uploading ? "Wysyłanie..." : "Dodaj zdjęcie"}</button>{draft.imageUrl && <span className="text-xs text-emerald-600">Zdjęcie dodane</span>}</div><div className="space-y-2"><span className="text-sm font-medium text-stone-700 dark:text-stone-300">Linki ofert</span>{draft.offerUrls.map((url, index) => <div key={index} className="flex gap-2"><input type="url" placeholder="https://..." value={url} onChange={(event) => setDraft({ ...draft, offerUrls: draft.offerUrls.map((value, i) => i === index ? event.target.value : value) })} /><button type="button" onClick={() => setDraft({ ...draft, offerUrls: draft.offerUrls.filter((_, i) => i !== index) })} className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-stone-200 text-stone-500 dark:border-stone-700"><X className="h-4 w-4" /></button></div>)}<button type="button" onClick={() => setDraft({ ...draft, offerUrls: [...draft.offerUrls, ""] })} className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400"><Link2 className="h-4 w-4" /> Dodaj link</button></div><DialogActions onClose={onClose} /></form></Dialog>; }
function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-0 sm:items-center sm:justify-center sm:p-4" onMouseDown={onClose}>
      <div className="app-dialog-surface shopping-list-dialog w-full max-w-lg rounded border border-stone-200 bg-white p-5 shadow-xl dark:border-stone-800 dark:bg-stone-900 sm:max-h-[90vh] sm:overflow-y-auto" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between"><h2 className="font-bold text-stone-900 dark:text-white">{title}</h2><IconButton label="Zamknij" onClick={onClose}><X /></IconButton></div>
        {children}
      </div>
    </div>,
    document.body
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-2 text-sm font-medium text-stone-700 dark:text-stone-300"><span>{label}</span>{children}</label>; }
function DialogActions({ onClose }: { onClose: () => void }) { return <div className="flex justify-end gap-2 border-t border-stone-200 pt-4 dark:border-stone-800"><button type="button" onClick={onClose} className="rounded px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">Anuluj</button><button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Zapisz</button></div>; }
function ConfirmDialog({ title, message, onClose, onConfirm }: { title: string; message: string; onClose: () => void; onConfirm: () => Promise<void> }) { const [saving, setSaving] = useState(false); return <Dialog title={title} onClose={onClose}><p className="text-sm text-stone-500 dark:text-stone-400">{message}</p><div className="mt-6 flex justify-end gap-2 border-t border-stone-200 pt-4 dark:border-stone-800"><button type="button" onClick={onClose} className="rounded px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">Anuluj</button><button type="button" disabled={saving} onClick={async () => { setSaving(true); await onConfirm(); }} className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{saving ? "Usuwanie..." : "Usuń"}</button></div></Dialog>; }
