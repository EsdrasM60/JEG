"use client";
import useSWR from "swr";
import { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, PlusIcon, XMarkIcon, CheckCircleIcon, InformationCircleIcon, PaperClipIcon } from "@heroicons/react/24/outline";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Programa = {
  _id: string;
  fichaId: any; // populated
  voluntarioId: any; // populated (supervisor)
  ayudanteId?: any; // populated (tecnico)
  asignadoFecha: string; // fecha objetivo
  completadoFecha?: string | null;
  notas?: string | null;
  fotos?: string[];
  createdAt?: string; // fecha en que se asignó (creación)
};

type Ficha = { _id?: string; id?: string; titulo: string; pdfId?: string | null };

type Volunteer = { _id?: string; id?: string; nombre: string; apellido: string };

export default function TareasPage() {
  const { data: fichasResp } = useSWR<{ items: Ficha[] }>(`/api/tareas/fichas?page=1&pageSize=10000&sort=alpha`, fetcher);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const { data: programasResp, mutate } = useSWR<{ items: Programa[] }>(`/api/tareas/programa?page=1&pageSize=2000&year=${year}`, fetcher);
  const { data: voluntariosResp } = useSWR<any>("/api/voluntarios", fetcher);
  const [q, setQ] = useState("");

  const fichas = useMemo(() => (fichasResp?.items || []), [fichasResp]);
  const programas = useMemo(() => (programasResp?.items || []), [programasResp]);
  const voluntarios = useMemo(() => {
    const resp = voluntariosResp;
    if (Array.isArray(resp)) return resp as Volunteer[];
    return (resp?.items || []) as Volunteer[];
  }, [voluntariosResp]);

  function fmt(d?: string | null) {
    if (!d) return "";
    try { return new Date(d).toLocaleDateString(); } catch { return d || ""; }
  }
  function yearOf(d: string | null | undefined) {
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt as any) ? null : dt.getFullYear();
  }

  // Filtrar por año y búsqueda
  const programasPorFicha = useMemo(() => {
    const mapa = new Map<string, Programa[]>();
    for (const p of programas) {
      const refYear = yearOf(p.completadoFecha || p.asignadoFecha);
      if (refYear !== year) continue;
      const fid = p.fichaId?._id || p.fichaId?.id || "";
      if (!fid) continue;
      if (!mapa.has(fid)) mapa.set(fid, []);
      mapa.get(fid)!.push(p);
    }
    // ordenar por fecha desc
    for (const arr of mapa.values()) {
      arr.sort((a, b) => new Date(b.completadoFecha || b.asignadoFecha).getTime() - new Date(a.completadoFecha || a.asignadoFecha).getTime());
    }
    return mapa;
  }, [programas, year]);

  const visibles = useMemo(() => {
    const term = q.trim().toLowerCase();
    return fichas.filter((f) => {
      if (!term) return true;
      return (f.titulo || "").toLowerCase().includes(term);
    });
  }, [fichas, q]);

  // Modal crear asignación
  const [openCreate, setOpenCreate] = useState(false);
  const [currentFicha, setCurrentFicha] = useState<Ficha | null>(null);
  const [saving, setSaving] = useState(false);
  const [createFotos, setCreateFotos] = useState<string[]>([]);

  async function uploadImage(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.thumbId as string) || (json.id as string);
  }

  function removeCreateFoto(id: string) {
    setCreateFotos((arr) => arr.filter((x) => x !== id));
  }

  function openForFicha(f: Ficha) {
    setCurrentFicha(f);
    setOpenCreate(true);
  }
  async function crearAsignacion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!currentFicha) return;
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      fichaId: currentFicha._id || currentFicha.id,
      voluntarioId: fd.get("voluntarioId"),
      ayudanteId: fd.get("ayudanteId") || null,
      asignadoFecha: fd.get("asignadoFecha"),
      // completadoFecha se omite para que quede en blanco inicialmente
      notas: fd.get("notas") || null,
      fotos: createFotos,
    };
    setSaving(true);
    await fetch("/api/tareas/programa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    setOpenCreate(false);
    setCurrentFicha(null);
    setCreateFotos([]);
    mutate();
  }

  // Estado de edición
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Programa | null>(null);
  const [editFotos, setEditFotos] = useState<string[]>([]);

  function openEdit(p: Programa) {
    setEditItem(p);
    setEditFotos((p as any).fotos || []);
    setEditOpen(true);
  }

  function removeEditFoto(id: string) {
    setEditFotos((arr) => arr.filter((x) => x !== id));
  }

  async function guardarEdicion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editItem) return;
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      voluntarioId: fd.get("voluntarioId") || (editItem as any).voluntarioId?._id || (editItem as any).voluntarioId?.id,
      ayudanteId: fd.get("ayudanteId") || "",
      completadoFecha: fd.get("completadoFecha") || null,
      notas: fd.get("notas") || null,
      fotos: editFotos,
    };
    await fetch(`/api/tareas/programa/${editItem._id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setEditOpen(false);
    setEditItem(null);
    mutate();
  }

  return (
    <section className="space-y-4">
      <div className="sticky top-0 z-40 bg-[color:var(--surface)]/90 backdrop-blur border-b">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2 text-sm overflow-x-auto whitespace-nowrap -mx-1 px-1">
            <span className="px-3 py-1 rounded border bg-white/5">Programa</span>
            <a href="/tareas/fichas" className="px-3 py-1 rounded border">Fichas</a>
            <a href="/tareas/calendario" className="px-3 py-1 rounded border">Calendario</a>
          </div>
        </div>
      </div>

      <h1 className="text-2xl font-bold">Tareas</h1>

      {/* Controles de año */}
      <div className="flex items-center justify-center gap-2">
        <button className="border rounded p-2 min-w-10 min-h-10" onClick={() => setYear((y) => y - 1)} aria-label="Anterior"><ChevronLeftIcon className="w-5 h-5" /></button>
        <button className="border rounded px-3 py-1 inline-flex items-center gap-2" onClick={() => setYear(new Date().getFullYear())} title="Año actual">
          <CalendarIcon className="w-5 h-5" />
          <span className="font-medium">{year}</span>
        </button>
        <button className="border rounded p-2 min-w-10 min-h-10" onClick={() => setYear((y) => y + 1)} aria-label="Siguiente"><ChevronRightIcon className="w-5 h-5" /></button>
      </div>

      {/* Buscar */}
      <div>
        <input className="w-full input" placeholder="Buscar..." value={q} onChange={(e)=>setQ(e.target.value)} />
      </div>

      {/* Listado por ficha */}
      <div className="space-y-6">
        {visibles.map((f) => {
          const fid = f._id || f.id || "";
          const items = programasPorFicha.get(String(fid)) || [];
          return (
            <div key={String(fid)}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold uppercase tracking-wide">{f.titulo}</div>
                <button className="inline-flex items-center gap-2 btn" onClick={() => openForFicha(f)}>
                  <PlusIcon className="w-5 h-5" /> Agregar nuevo
                </button>
              </div>
              {items.length === 0 ? (
                <div className="text-sm text-[color:var(--muted)]">Sin registros en {year}.</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((p) => {
                    const isDone = !!p.completadoFecha;
                    const hasAdj = !!(p as any).fichaId?.pdfId;
                    return (
                      <div key={p._id} className="card overflow-hidden cursor-pointer" onClick={() => openEdit(p)}>
                        <div className="px-3 py-2 text-sm flex items-start justify-between bg-[color:var(--surface-2)] border-b border-[color:var(--border)]">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {p.voluntarioId ? `${p.voluntarioId?.nombre} ${p.voluntarioId?.apellido}` : "(sin supervisor)"}
                            </div>
                            <div className="text-xs text-[color:var(--muted)] truncate">
                              Técnico {p.ayudanteId ? `· ${p.ayudanteId?.nombre} ${p.ayudanteId?.apellido}` : "(ninguno)"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            {hasAdj && (
                              <a
                                href={`/api/tareas/fichas/file/${(p as any).fichaId.pdfId}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="Ver adjunto de la ficha"
                                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border bg-[color:var(--surface)] hover:bg-white/5"
                              >
                                <PaperClipIcon className="w-4 h-4" />
                                Adjunto
                              </a>
                            )}
                            <span className={`badge ${isDone ? "badge-success" : "badge-warning"}`}>
                              {isDone ? "Completo" : "Pendiente"}
                            </span>
                          </div>
                        </div>
                        <div className="px-3 py-3 text-sm">
                          <div className="font-semibold flex items-center gap-2">
                            {isDone ? "Fecha que se completó" : "Debe cumplir con la asignación para"}
                          </div>
                          <div className="mb-2 text-lg font-bold">{fmt(p.completadoFecha || p.asignadoFecha)}</div>
                          {p.notas ? (
                            <div className="text-[color:var(--foreground)]/90 whitespace-pre-wrap" style={{wordBreak:'break-word'}}>{p.notas}</div>
                          ) : null}
                          {Array.isArray((p as any).fotos) && (p as any).fotos.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(p as any).fotos.slice(0,6).map((id: string) => (
                                <div key={id} className="w-12 h-12 border rounded overflow-hidden bg-[color:var(--surface-2)]">
                                  <img src={`/api/images/${id}?thumb=1`} alt="foto" className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          ) : null}
                          <div className="mt-2 text-xs text-[color:var(--muted)]">Click para {isDone ? "editar" : "marcar como completo"}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal crear */}
      {openCreate && currentFicha && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpenCreate(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="card w-[95vw] max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-4 py-3 card-header flex items-center gap-2">
                <div className="font-semibold">Nuevo registro</div>
                <button className="ml-auto btn btn-ghost" onClick={() => setOpenCreate(false)} aria-label="Cerrar">Cerrar</button>
              </div>
              <form onSubmit={crearAsignacion} className="flex-1 overflow-auto p-4">
                {currentFicha.pdfId ? (
                  <div className="mb-4 border rounded bg-[color:var(--surface-2)] p-3 flex items-center gap-3">
                    <div className="text-sm font-medium">Archivo de ficha:</div>
                    <a className="text-blue-400 underline text-sm" href={`/api/tareas/fichas/file/${currentFicha.pdfId}`} target="_blank" rel="noreferrer">Abrir</a>
                    <a className="text-blue-400 underline text-sm" href={`/api/tareas/fichas/file/${currentFicha.pdfId}`} download>Descargar</a>
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm mb-1">Asignado a (Supervisor)</label>
                    <select name="voluntarioId" className="select" required defaultValue="">
                      <option value="" disabled>No seleccionado</option>
                      {voluntarios.map((v) => (<option key={v._id || v.id} value={v._id || v.id}>{v.nombre} {v.apellido}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Técnico</label>
                    <select name="ayudanteId" className="select" defaultValue="">
                      <option value="">No seleccionado</option>
                      {voluntarios.map((v) => (<option key={v._id || v.id} value={v._id || v.id}>{v.nombre} {v.apellido}</option>))}
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm">Debe cumplir con la asignación para</div>
                  <input type="date" name="asignadoFecha" className="input mt-1" required />
                </div>
                <div className="mt-4">
                  <div className="text-sm mb-1">Notas</div>
                  <textarea name="notas" className="w-full textarea min-h-[120px]" />
                </div>
                <div className="mt-4">
                  <div className="text-sm mb-1">Fotos</div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {createFotos.map((id) => (
                      <div key={id} className="relative w-20 h-20 border rounded overflow-hidden bg-[color:var(--surface-2)]">
                        <img src={`/api/images/${id}`} alt="foto" className="w-full h-full object-cover" />
                        <button type="button" className="absolute top-0 right-0 bg-black/60 text-white text-xs px-1" onClick={() => removeCreateFoto(id)}>x</button>
                      </div>
                    ))}
                  </div>
                  <input type="file" accept="image/*" onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const id = await uploadImage(f);
                    if (id) setCreateFotos((arr) => [...arr, id]);
                    e.currentTarget.value = "";
                  }} />
                </div>
                <div className="px-0 pt-3 mt-4 border-t flex items-center gap-2 justify-end">
                  <button className="btn btn-primary disabled:opacity-50" disabled={saving} type="submit">{saving?"Guardando...":"Guardar"}</button>
                  <button type="button" className="btn" onClick={() => setOpenCreate(false)}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar (completar) */}
      {editOpen && editItem && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="card w-[95vw] max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-4 py-3 card-header flex items-center gap-2">
                <div className="text-lg font-semibold uppercase">{(editItem.fichaId?.titulo || "").toString()}</div>
                <button className="ml-auto btn btn-ghost" onClick={() => setEditOpen(false)} aria-label="Cerrar">Cerrar</button>
              </div>
              <form onSubmit={guardarEdicion} className="p-4 space-y-4 overflow-auto">
                {(editItem as any).fichaId?.pdfId ? (
                  <div className="border rounded bg-[color:var(--surface-2)] p-3 flex items-center gap-3">
                    <div className="text-sm font-medium">Archivo de ficha:</div>
                    <a className="text-blue-400 underline text-sm" href={`/api/tareas/fichas/file/${(editItem as any).fichaId.pdfId}`} target="_blank" rel="noreferrer">Abrir</a>
                    <a className="text-blue-400 underline text-sm" href={`/api/tareas/fichas/file/${(editItem as any).fichaId.pdfId}`} download>Descargar</a>
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm mb-1">Asignado a (Supervisor)</label>
                    <select name="voluntarioId" className="w-full border rounded px-2 py-1" defaultValue={(editItem as any).voluntarioId?._id || (editItem as any).voluntarioId?.id || ""} required>
                      <option value="" disabled>No seleccionado</option>
                      {voluntarios.map((v) => (<option key={v._id || (v as any).id} value={v._id || (v as any).id}>{v.nombre} {v.apellido}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Técnico</label>
                    <select name="ayudanteId" className="w-full border rounded px-2 py-1" defaultValue={(editItem as any).ayudanteId?._id || (editItem as any).ayudanteId?.id || ""}>
                      <option value="">No seleccionado</option>
                      {voluntarios.map((v) => (<option key={v._id || (v as any).id} value={v._id || (v as any).id}>{v.nombre} {v.apellido}</option>))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-sm text-neutral-800">Fecha en que se asignó</div>
                    <div className="text-base font-medium mt-1">{fmt((editItem as any).createdAt || (editItem as any).asignadoFecha)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-neutral-800">Debe cumplir con la asignación para</div>
                    <div className="text-2xl font-bold mt-1">{fmt((editItem as any).asignadoFecha)}</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-neutral-800">Fecha que se completó</div>
                  <input type="date" name="completadoFecha" className="border rounded px-2 py-1 mt-1" defaultValue={(editItem as any).completadoFecha ? String((editItem as any).completadoFecha).slice(0,10) : ""} />
                </div>

                <div>
                  <div className="text-sm text-neutral-800 mb-1">Notas</div>
                  <textarea name="notas" className="w-full border rounded px-3 py-2 min-h-[100px]" defaultValue={(editItem as any).notas || ""} />
                </div>

                <div>
                  <div className="text-sm text-neutral-800 mb-1">Fotos</div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editFotos.map((id) => (
                      <div key={id} className="relative w-20 h-20 border rounded overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/images/${id}`} alt="foto" className="w-full h-full object-cover" />
                        <button type="button" className="absolute top-0 right-0 bg-black/60 text-white text-xs px-1" onClick={() => removeEditFoto(id)}>x</button>
                      </div>
                    ))}
                  </div>
                  <input type="file" accept="image/*" onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const id = await uploadImage(f);
                    if (id) setEditFotos((arr) => [...arr, id]);
                    e.currentTarget.value = "";
                  }} />
                </div>

                <div className="pt-3 border-t flex items-center justify-end gap-2">
                  <button type="submit" className="btn btn-primary">Guardar</button>
                  <button type="button" className="btn" onClick={() => setEditOpen(false)}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
