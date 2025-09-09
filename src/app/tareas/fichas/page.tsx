"use client";
import useSWR from "swr";
import React from "react";
import { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { PencilSquareIcon, PhotoIcon, PaperClipIcon, ListBulletIcon, HashtagIcon, CheckCircleIcon, ArrowsRightLeftIcon, CodeBracketIcon, PlusCircleIcon, TrashIcon } from "@heroicons/react/24/outline";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ChecklistItem = { text: string; done?: boolean };

type Ficha = {
  id: string;
  titulo: string;
  descripcion?: string | null;
  prioridad: "BAJA" | "MEDIA" | "ALTA";
  estado: "ABIERTA" | "EN_PROGRESO" | "COMPLETADA";
  asignado_a?: string | null;
  vencimiento?: string | null;
  createdAt?: string;
  pdfId?: string | null;
  instrucciones?: string | null;
  notas?: string | null;
  checklist?: ChecklistItem[];
};

type ApiResp = { items: Ficha[]; total: number; page: number; pageSize: number };

type RichEditorProps = {
  value: string;
  onChange: (html: string) => void;
  onAttach?: (id: string, url: string, name: string) => void;
  original?: string; // Para modo diff
};

function RichTextEditor({ value, onChange, onAttach, original = "" }: RichEditorProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const imgInput = React.useRef<HTMLInputElement | null>(null);
  const fileInput = React.useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<"rich" | "source" | "diff">("rich");
  const [sourceText, setSourceText] = useState<string>(value || "");

  useEffect(() => {
    if (mode !== "source") setSourceText(value || "");
  }, [value, mode]);

  function exec(command: string) {
    document.execCommand(command, false);
    if (ref.current) onChange(ref.current.innerHTML);
  }
  function onInput() {
    if (ref.current) onChange(ref.current.innerHTML);
  }
  function insertHtml(html: string) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      if (ref.current) {
        ref.current.insertAdjacentHTML("beforeend", html);
        onChange(ref.current.innerHTML);
      }
      return;
    }
    const range = sel.getRangeAt(0);
    const el = document.createElement("div");
    el.innerHTML = html;
    const frag = document.createDocumentFragment();
    while (el.firstChild) frag.appendChild(el.firstChild);
    range.deleteContents();
    range.insertNode(frag);
    if (ref.current) onChange(ref.current.innerHTML);
  }
  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const j = await res.json();
      if (j?.id) {
        const url = `/api/images/${j.id}`;
        insertHtml(`<img src="${url}" alt="" style="max-width:100%; height:auto;" />`);
      }
    } finally {
      if (imgInput.current) imgInput.current.value = "";
    }
  }
  async function handleAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/tareas/fichas/pdf", { method: "POST", body: fd });
      const j = await res.json();
      if (j?.id) {
        const url = `/api/tareas/fichas/file/${j.id}`;
        const name = (file as any).name || "archivo";
        insertHtml(`<a href="${url}" target="_blank" rel="noreferrer">${name}</a>`);
        onAttach && onAttach(String(j.id), url, name);
      }
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  function insertChecklist() {
    insertHtml('<ul class="task-list"><li><input type="checkbox"/> Nuevo ítem</li></ul>');
  }
  function switchMode(next: "rich" | "source" | "diff") {
    if (mode === "source" && next !== "source") {
      onChange(sourceText);
      // Sincroniza el contenido editable
      if (ref.current) ref.current.innerHTML = sourceText;
    }
    setMode(next);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 'b') { e.preventDefault(); exec('bold'); }
      else if (k === 'i') { e.preventDefault(); exec('italic'); }
      else if (k === 'u') { e.preventDefault(); exec('underline'); }
    }
  }
  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const t = e.target as HTMLElement;
    if (t && (t as HTMLInputElement).type === 'checkbox') {
      // Espera a que el DOM aplique el cambio del checkbox
      setTimeout(() => { if (ref.current) onChange(ref.current.innerHTML); }, 0);
    }
  }

  return (
    <div className="border rounded bg-white">
      <div className="flex items-center gap-2 px-3 py-2 text-sm bg-neutral-100 border-b rounded-t">
        {/* Left group: basic formatting */}
        <button type="button" title="Negrita (Cmd+B)" onClick={() => exec("bold")} className="font-bold">B</button>
        <button type="button" title="Cursiva (Cmd+I)" onClick={() => exec("italic")} className="italic">I</button>
        <button type="button" title="Subrayado (Cmd+U)" onClick={() => exec("underline")} className="underline">U</button>
        <span className="mx-1 h-5 w-px bg-neutral-300" />
        <button type="button" title="Lista con viñetas" onClick={() => exec("insertUnorderedList")}><ListBulletIcon className="w-5 h-5" /></button>
        <button type="button" title="Lista numerada" onClick={() => exec("insertOrderedList")}><HashtagIcon className="w-5 h-5" /></button>
        <button type="button" title="Checklist" onClick={insertChecklist}><CheckCircleIcon className="w-5 h-5" /></button>
        <span className="mx-1 h-5 w-px bg-neutral-300 ml-auto" />
        {/* Right group: attachments */}
        <button type="button" title="Insertar imagen" onClick={() => imgInput.current?.click()} className="border rounded px-2 py-1 bg-white"><PhotoIcon className="w-5 h-5" /></button>
        <input ref={imgInput} type="file" accept="image/*" className="hidden" onChange={handleImage} />
        <button type="button" title="Adjuntar archivo (PDF/DOCX)" onClick={() => fileInput.current?.click()} className="border rounded px-2 py-1 bg-white"><PaperClipIcon className="w-5 h-5" /></button>
        <input ref={fileInput} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={handleAttach} />
        <span className="mx-1 h-5 w-px bg-neutral-300" />
        {/* Modes */}
        <button type="button" title="Rich text" onClick={() => switchMode("rich")} className={`border rounded px-2 py-1 ${mode==='rich'?'bg-neutral-200':''}`}><ArrowsRightLeftIcon className="w-5 h-5" /></button>
        <button type="button" title="Diff" onClick={() => switchMode("diff")} className={`border rounded px-2 py-1 ${mode==='diff'?'bg-neutral-200':''}`}>≠</button>
        <button type="button" title="Source" onClick={() => switchMode("source")} className={`border rounded px-2 py-1 ${mode==='source'?'bg-neutral-200':''}`}><CodeBracketIcon className="w-5 h-5" /></button>
      </div>
      {mode === "rich" && (
        <div
          ref={ref}
          className="min-h-[160px] p-3 outline-none"
          contentEditable
          onInput={onInput}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          dangerouslySetInnerHTML={{ __html: value || "" }}
        />
      )}
      {mode === "source" && (
        <textarea
          className="w-full min-h-[200px] p-3 outline-none bg-white"
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          onBlur={() => onChange(sourceText)}
        />
      )}
      {mode === "diff" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 bg-neutral-50">
          <div className="border rounded bg-white">
            <div className="px-2 py-1 text-xs text-neutral-600 border-b">Antes</div>
            <pre className="p-2 whitespace-pre-wrap text-xs">{original || ""}</pre>
          </div>
          <div className="border rounded bg-white">
            <div className="px-2 py-1 text-xs text-neutral-600 border-b">Actual</div>
            <pre className="p-2 whitespace-pre-wrap text-xs">{value || ""}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FichasPage() {
  // Reemplazar estados de paginación por constantes
  const page = 1;
  const pageSize = 1000;
  const sort: 'alpha' | 'recent' = 'alpha';
  const { data, mutate, isLoading } = useSWR<ApiResp>(`/api/tareas/fichas?page=${page}&pageSize=${pageSize}&sort=${sort}` , fetcher);

  // Filtros (cliente)
  const [q, setQ] = useState("");
  const [fPrioridad, setFPrioridad] = useState<"ALL" | Ficha["prioridad"]>("ALL");
  const [fEstado, setFEstado] = useState<"ALL" | Ficha["estado"]>("ALL");

  const filtered = useMemo(() => {
    let rows = data?.items ?? [];
    if (q.trim()) {
      const s = q.toLowerCase();
      rows = rows.filter((r) =>
        (r.titulo || "").toLowerCase().includes(s) || (r.descripcion || "").toLowerCase().includes(s) || (r.asignado_a || "").toLowerCase().includes(s)
      );
    }
    if (fPrioridad !== "ALL") rows = rows.filter((r) => r.prioridad === fPrioridad);
    if (fEstado !== "ALL") rows = rows.filter((r) => r.estado === fEstado);
    // Orden fijo alfabético
    rows = rows.slice().sort((a,b)=> (a.titulo||'').localeCompare(b.titulo||'', 'es', {sensitivity:'base'}));
    return rows;
  }, [data, q, fPrioridad, fEstado]);

  // Crear
  const [form, setForm] = useState({ titulo: "", descripcion: "", prioridad: "MEDIA", asignado_a: "", vencimiento: "", instrucciones: "", notas: "" } as any);
  const [checklistForm, setChecklistForm] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);
  const [createPdfId, setCreatePdfId] = useState<string | null>(null);
  const [createPdfName, setCreatePdfName] = useState<string | null>(null);
  const [rtContent, setRtContent] = useState("");
  const [rtNotesContent, setRtNotesContent] = useState("");

  async function createFicha(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/tareas/fichas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        titulo: form.titulo,
        descripcion: null,
        prioridad: "MEDIA",
        asignado_a: null,
        vencimiento: null,
        instrucciones: rtContent || null,
        notas: rtNotesContent || null,
        ...(createPdfId ? { pdfId: createPdfId } : {}),
      }),
    });
    setSaving(false);
    setForm({ titulo: "", descripcion: "", prioridad: "MEDIA", asignado_a: "", vencimiento: "", instrucciones: "", notas: "" });
    setChecklistForm([]);
    setRtContent("");
    setRtNotesContent("");
    setCreatePdfId(null);
    setCreatePdfName(null);
    setNewItem("");
    mutate();
    setCreateOpen(false);
  }

  function addChecklistItem() {
    if (!newItem.trim()) return;
    setChecklistForm((prev) => [...prev, { text: newItem.trim(), done: false }]);
    setNewItem("");
  }

  function removeChecklistItem(idx: number) {
    setChecklistForm((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleChecklistItem(idx: number) {
    setChecklistForm((prev) => prev.map((it, i) => (i === idx ? { ...it, done: !it.done } : it)));
  }

  function moveChecklistItem(idx: number, dir: -1 | 1) {
    setChecklistForm((prev) => {
      const next = [...prev];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= next.length) return prev;
      const [item] = next.splice(idx, 1);
      next.splice(newIdx, 0, item);
      return next;
    });
  }

  // Crear desde archivo (PDF/DOC)
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState<"form" | "file">("form");

  async function createFromFile(e: React.FormEvent) {
    e.preventDefault();
    const f = fileRef.current?.files?.[0];
    if (!f) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", f);
    const up = await fetch("/api/tareas/fichas/pdf", { method: "POST", body: fd });
    const uj = await up.json();
    if (uj?.id) {
      await fetch("/api/tareas/fichas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titulo: f.name.replace(/\.(pdf|doc)$/i, ""), pdfId: uj.id }),
      });
      mutate();
      if (fileRef.current) fileRef.current.value = "";
      setCreateOpen(false);
    }
    setUploading(false);
  }

  // Edición en modal
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editChecklist, setEditChecklist] = useState<ChecklistItem[]>([]);
  const [editNewItem, setEditNewItem] = useState("");
  const editFileRef = useRef<HTMLInputElement | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editRtContent, setEditRtContent] = useState("");
  const [editNotesRtContent, setEditNotesRtContent] = useState("");

  function startEdit(f: Ficha) {
    setEditId(f.id);
    setEditForm({
      titulo: f.titulo,
      descripcion: f.descripcion || "",
      prioridad: f.prioridad,
      estado: f.estado,
      asignado_a: f.asignado_a || "",
      vencimiento: f.vencimiento ? f.vencimiento.substring(0, 10) : "",
      instrucciones: f.instrucciones || "",
      notas: f.notas || "",
      pdfId: f.pdfId ?? undefined,
    });
    setEditRtContent(f.instrucciones || "");
    setEditNotesRtContent(f.notas || "");
    setEditChecklist(Array.isArray(f.checklist) ? f.checklist : []);
    setEditOpen(true);
  }

  // Cerrar con ESC en modales
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') { if (editOpen) { setEditOpen(false); setEditId(null); } if (createOpen) setCreateOpen(false); } }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editOpen]);

  async function saveEdit(id: string) {
    let nextPdfId = editForm.pdfId ?? undefined;
    const file = editFileRef.current?.files?.[0];
    if (file) {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/tareas/fichas/pdf", { method: "POST", body: fd });
      const uj = await up.json();
      if (uj?.id) nextPdfId = uj.id;
    }

    await fetch(`/api/tareas/fichas/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        descripcion: editForm.descripcion || null,
        asignado_a: editForm.asignado_a || null,
        vencimiento: editForm.vencimiento || null,
        instrucciones: editRtContent || null,
        notas: editNotesRtContent || null,
        checklist: editChecklist,
        ...(nextPdfId !== undefined ? { pdfId: nextPdfId } : {}),
      }),
    });
    if (editFileRef.current) editFileRef.current.value = "";
    setEditId(null);
    setEditOpen(false);
    mutate();
  }

  function addEditChecklistItem() {
    if (!editNewItem.trim()) return;
    setEditChecklist((prev) => [...prev, { text: editNewItem.trim(), done: false }]);
    setEditNewItem("");
  }
  function removeEditChecklistItem(idx: number) {
    setEditChecklist((prev) => prev.filter((_, i) => i !== idx));
  }
  function toggleEditChecklistItem(idx: number) {
    setEditChecklist((prev) => prev.map((it, i) => (i === idx ? { ...it, done: !it.done } : it)));
  }

  function moveEditChecklistItem(idx: number, dir: -1 | 1) {
    setEditChecklist((prev) => {
      const next = [...prev];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= next.length) return prev;
      const [item] = next.splice(idx, 1);
      next.splice(newIdx, 0, item);
      return next;
    });
  }

  async function deleteFicha(id: string) {
    await fetch(`/api/tareas/fichas/${id}`, { method: "DELETE" });
    mutate();
  }

  const total = data?.total ?? 0;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));

  // Nuevo modal de vista con pestañas (Vista / Archivo)
  const [previewFicha, setPreviewFicha] = useState<Ficha | null>(null);
  const [previewTab, setPreviewTab] = useState<"vista" | "archivo">("vista");
  const fileUrl = previewFicha?.pdfId ? `/api/tareas/fichas/file/${previewFicha.pdfId}` : null;

  function openPreview(f: Ficha) {
    setPreviewFicha(f);
    setPreviewTab("vista");
  }
  function closePreview() {
    setPreviewFicha(null);
  }

  // Eliminar con confirmación
  async function handleDeleteCurrent() {
    if (!editId) return;
    const ok = window.confirm("¿Seguro que deseas eliminar esta ficha?");
    if (!ok) return;
    await deleteFicha(editId);
    setEditOpen(false);
    setEditId(null);
  }

  return (
    <section className="space-y-6">
      {/* Barra de navegación fija */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-4 text-sm">
            <Link href="/tareas" className="px-3 py-1 rounded border">Programa</Link>
            <span className="px-3 py-1 rounded border bg-neutral-100">Fichas</span>
          </div>
        </div>
      </div>

      {/* Encabezado con botón Nuevo */}
      <div className="flex items-center justify-between px-1">
        <h1 className="text-2xl font-bold">Fichas</h1>
        <button
          className="inline-flex items-center gap-2 px-3 py-2 rounded bg-foreground text-background"
          onClick={() => setCreateOpen(true)}
          aria-label="Nueva ficha"
        >
          <PlusCircleIcon className="w-5 h-5" />
          <span>Nuevo</span>
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : (
        <>
          <ul className="grid gap-2">
            {filtered?.map((f) => (
              <li key={f.id} className="border rounded px-3 py-2 flex items-center justify-between">
                <span className="truncate font-medium">{f.titulo}</span>
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex items-center justify-center w-8 h-8 rounded border hover:bg-neutral-100"
                    onClick={() => startEdit(f)}
                    aria-label="Editar"
                    title="Editar"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>
                  <button
                    className="inline-flex items-center justify-center w-8 h-8 rounded border hover:bg-red-50 text-red-600"
                    onClick={async () => { if (confirm("¿Eliminar ficha?")) await deleteFicha(f.id); }}
                    aria-label="Eliminar"
                    title="Eliminar"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Modal de creación (formato unificado) */}
      {createOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={()=>setCreateOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-[#fbfbfa] rounded shadow-lg w-[95vw] max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <div className="text-lg font-semibold">Tareas</div>
                <button className="ml-auto px-2 py-1 border rounded" onClick={()=>setCreateOpen(false)} aria-label="Cerrar">✕</button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <form onSubmit={createFicha} className="flex flex-col gap-6">
                  <div>
                    <input className="w-full border rounded px-3 py-3 bg-white" placeholder="Nombre" value={form.titulo} onChange={(e)=>setForm({...form, titulo:e.target.value})} required />
                  </div>
                  <hr className="border-neutral-200" />
                  <div>
                    <div className="text-sm text-neutral-800 mb-2">Instrucciones</div>
                    <RichTextEditor value={rtContent} onChange={setRtContent} original="" onAttach={(id, url, name)=>{ setCreatePdfId(id); setCreatePdfName(name); }} />
                  </div>
                  <hr className="border-neutral-200" />
                  <div>
                    <div className="text-sm text-neutral-800 mb-2">Notas</div>
                    <RichTextEditor value={rtNotesContent} onChange={setRtNotesContent} original="" />
                  </div>
                </form>
              </div>
              <div className="px-4 py-3 border-t bg-[#fbfbfa] flex items-center gap-2 justify-end">
                <button className="rounded bg-foreground text-background px-4 py-2 disabled:opacity-50" disabled={saving || !form.titulo} onClick={createFicha as any}>
                  {saving?"Guardando...":"Guardar"}
                </button>
                <button className="border rounded px-4 py-2" onClick={()=>setCreateOpen(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición (formato unificado) */}
      {editOpen && editId && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setEditOpen(false); setEditId(null); }} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-[#fbfbfa] rounded shadow-lg w-[95vw] max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <div className="text-lg font-semibold">Tareas</div>
                <button className="ml-auto px-2 py-1 border rounded" onClick={() => { setEditOpen(false); setEditId(null); }} aria-label="Cerrar">✕</button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <div className="flex flex-col gap-6">
                  <div>
                    <input className="w-full border rounded px-3 py-3 bg-white" value={editForm.titulo || ""} onChange={(e)=>setEditForm({...editForm, titulo:e.target.value})} />
                  </div>
                  <hr className="border-neutral-200" />
                  <div>
                    <div className="text-sm text-neutral-800 mb-2">Instrucciones</div>
                    <RichTextEditor value={editRtContent} onChange={setEditRtContent} original={editForm?.instrucciones || ""} onAttach={(id) => setEditForm((p: any) => ({ ...p, pdfId: id }))} />
                  </div>
                  <hr className="border-neutral-200" />
                  <div>
                    <div className="text-sm text-neutral-800 mb-2">Notas</div>
                    <RichTextEditor value={editNotesRtContent} onChange={setEditNotesRtContent} original={editForm?.notas || ""} />

                    {/* Adjuntos existentes */}
                    <div className="border rounded p-2 bg-white">
                      <div className="font-medium mb-2">Archivo de ficha</div>
                      <div className="flex items-center gap-2">
                        {editForm.pdfId ? (
                          <a className="text-blue-700 underline text-sm" href={`/api/tareas/fichas/file/${editForm.pdfId}`} target="_blank" rel="noreferrer">Ver actual</a>
                        ) : (
                          <span className="text-xs text-neutral-500">Sin archivo</span>
                        )}
                        <input ref={editFileRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 border-t bg-[#fbfbfa] flex items-center gap-2 justify-between">
                <button className="border border-red-600 text-red-700 rounded px-4 py-2 hover:bg-red-50" onClick={handleDeleteCurrent}>Eliminar</button>
                <div className="flex items-center gap-2">
                  <button className="rounded bg-foreground text-background px-4 py-2" onClick={() => saveEdit(editId!)}>Guardar</button>
                  <button className="border rounded px-4 py-2" onClick={() => { setEditOpen(false); setEditId(null); }}>Cancelar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nuevo modal de vista con pestañas (Vista / Archivo) */}
      {previewFicha && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={closePreview} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded shadow-lg w-[95vw] max-w-5xl h-[85vh] flex flex-col overflow-hidden">
              <div className="px-4 py-2 border-b flex items-center gap-2">
                <div className="font-medium truncate flex-1">{previewFicha.titulo}</div>
                <div className="flex items-center gap-2">
                  <button className={`px-3 py-1 border rounded ${previewTab==='vista'?'bg-neutral-100':''}`} onClick={()=>setPreviewTab('vista')}>Vista</button>
                  <button className={`px-3 py-1 border rounded ${previewTab==='archivo'?'bg-neutral-100':''}`} onClick={()=>setPreviewTab('archivo')} disabled={!fileUrl} title={fileUrl?"":"Sin archivo"}>Archivo</button>
                </div>
                {fileUrl ? (
                  <>
                    <a className="text-blue-700 underline text-sm" href={fileUrl} target="_blank" rel="noreferrer">Abrir en pestaña</a>
                    <a className="text-blue-700 underline text-sm" href={fileUrl} download>Descargar</a>
                  </>
                ) : null}
                <button className="ml-2 px-2 py-1 border rounded" onClick={closePreview}>Cerrar</button>
              </div>
              <div className="flex-1 bg-neutral-50 overflow-auto">
                {previewTab === "vista" ? (
                  <div className="p-4 max-w-4xl mx-auto">
                    <div className="border rounded p-4 bg-white">
                      <div className="flex flex-wrap justify-between gap-2 mb-3">
                        <div>
                          <div className="text-xl font-semibold">{previewFicha.titulo}</div>
                          {previewFicha.descripcion ? (
                            <div className="text-sm text-neutral-700">{previewFicha.descripcion}</div>
                          ) : null}
                        </div>
                        <div className="text-xs text-neutral-700">
                          <div><span className="font-semibold">Prioridad:</span> {previewFicha.prioridad}</div>
                          <div><span className="font-semibold">Estado:</span> {previewFicha.estado}</div>
                          {previewFicha.vencimiento ? (
                            <div><span className="font-semibold">Vence:</span> {new Date(previewFicha.vencimiento).toLocaleDateString()}</div>
                          ) : null}
                          {previewFicha.asignado_a ? (
                            <div><span className="font-semibold">Asignado a:</span> {previewFicha.asignado_a}</div>
                          ) : null}
                        </div>
                      </div>
                      {previewFicha.instrucciones ? (
                        <div className="mb-3">
                          <div className="uppercase text-xs tracking-wide font-semibold text-neutral-600">Instrucciones</div>
                          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: previewFicha.instrucciones }} />
                        </div>
                      ) : null}
                      {Array.isArray(previewFicha.checklist) && previewFicha.checklist.length > 0 ? (
                        <div className="mb-3">
                          <div className="uppercase text-xs tracking-wide font-semibold text-neutral-600">Checklist</div>
                          <ul className="mt-1 space-y-1">
                            {previewFicha.checklist.map((item, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={!!item.done} readOnly />
                                <span className={item.done?"line-through":""}>{item.text}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {previewFicha.notas ? (
                        <div className="mb-3">
                          <div className="uppercase text-xs tracking-wide font-semibold text-neutral-600">Notas</div>
                          <div className="whitespace-pre-wrap text-sm">{previewFicha.notas}</div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  fileUrl ? (
                    <iframe title="Vista previa" src={fileUrl} className="w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-500">Sin archivo adjunto</div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}