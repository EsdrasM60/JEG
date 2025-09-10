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
  const { data: programasResp, mutate } = useSWR<{ items: Programa[] }>(`/api/tareas/programa?page=1&pageSize=2000`, fetcher);
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

  // Filtrar por año y búsqueda
  const programasPorFicha = useMemo(() => {
    const mapa = new Map<string, Programa[]>();
    const unassigned: Programa[] = [];
    for (const p of programas) {
      const fid = p.fichaId?._id || p.fichaId?.id || "";
      if (!fid) {
        unassigned.push(p);
        continue;
      }
      if (!mapa.has(fid)) mapa.set(fid, []);
      mapa.get(fid)!.push(p);
    }
    // ordenar por fecha desc
    for (const arr of mapa.values()) {
      arr.sort((a, b) => new Date(b.completadoFecha || b.asignadoFecha).getTime() - new Date(a.completadoFecha || a.asignadoFecha).getTime());
    }
    unassigned.sort((a, b) => new Date(b.completadoFecha || b.asignadoFecha).getTime() - new Date(a.completadoFecha || a.asignadoFecha).getTime());
    return { mapa, unassigned };
  }, [programas]);

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

  // Lista de proyectos para asignar la tarea
  const { data: proyectosResp } = useSWR<any>(`/api/proyectos?page=1&pageSize=1000`, fetcher);
  const proyectos = useMemo(() => {
    const items = proyectosResp?.items || [];
    return items as Array<{ _id: string; titulo: string }>;
  }, [proyectosResp]);

  // Nuevo: modal para crear tarea general (no ligada a ficha)
  const [openCreateTask, setOpenCreateTask] = useState(false);
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskFotos, setTaskFotos] = useState<string[]>([]);
  const [creatingProject, setCreatingProject] = useState(false);
  // Errores de validación para mostrar en el formulario de tarea
  const [taskErrors, setTaskErrors] = useState<Record<string, string>>({});

  async function uploadTaskImage(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.thumbId as string) || (json.id as string);
  }

  async function removeTaskFoto(id: string) {
    setTaskFotos((arr) => arr.filter((x) => x !== id));
  }

  async function crearTareaGeneral(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const projectChoice = fd.get("projectId") as string | null;
    const createProjectTitle = String(fd.get("newProjectTitle") || "").trim();

    setTaskSaving(true);
    try {
      let projectId: string | null = projectChoice || null;

      // Si el usuario quiere crear un proyecto nuevo en el mismo flujo
      if (creatingProject && createProjectTitle) {
        const res = await fetch("/api/proyectos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ titulo: createProjectTitle }) });
        if (!res.ok) throw new Error(await res.text());
        const proj = await res.json();
        projectId = proj._id || proj.id || null;
      }

      // Crear el programa (tarea) como antes
      const programaPayload: any = {
        fichaId: null, // no ligado a ficha
        voluntarioId: fd.get("voluntarioId") || undefined,
        ayudanteId: fd.get("ayudanteId") || undefined,
        asignadoFecha: fd.get("asignadoFecha") || null,
        notas: fd.get("notas") || null,
        fotos: taskFotos,
        // agregado: título de la tarea para referencia
        titulo: String(fd.get("titulo") || "").trim(),
        inicio: fd.get("startDate") || null,
        fin: fd.get("endDate") || null,
      };

      // Validaciones mínimas con resaltado de campos
      const errors: Record<string, string> = {};
      if (!programaPayload.titulo) errors.titulo = "El título es obligatorio";
      if (!programaPayload.voluntarioId) errors.voluntarioId = "Selecciona el supervisor asignado";
      if (!programaPayload.asignadoFecha) errors.asignadoFecha = "Selecciona la fecha de asignación";
      if (creatingProject && !createProjectTitle) errors.newProjectTitle = "Debe indicar el título del nuevo proyecto";

      if (Object.keys(errors).length > 0) {
        setTaskErrors(errors);
        // enfocar el primer campo inválido
        const first = Object.keys(errors)[0];
        const el = document.querySelector(`[name="${first}"]`) as HTMLElement | null;
        if (el && typeof el.focus === "function") el.focus();
        setTaskSaving(false);
        return;
      }

      // limpiar errores si todo está bien
      setTaskErrors({});

      // Crear en API de programas
      const resProg = await fetch("/api/tareas/programa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(programaPayload) });
      if (!resProg.ok) throw new Error(await resProg.text());
      const createdProg = await resProg.json();

      // Si hay proyecto seleccionado, obtener proyecto y anexar la tarea en weeklyTasks
      if (projectId) {
        // Obtener proyecto actual
        const pjRes = await fetch(`/api/proyectos/${projectId}`);
        if (pjRes.ok) {
          const pj = await pjRes.json();
          const existing = Array.isArray(pj.weeklyTasks) ? pj.weeklyTasks : [];
          const newTaskForProject = {
            weekStart: fd.get("asignadoFecha") ? new Date(String(fd.get("asignadoFecha"))) : new Date(),
            title: programaPayload.titulo,
            description: programaPayload.notas || "",
            assigneeId: programaPayload.voluntarioId,
            status: "todo",
            startDate: programaPayload.inicio ? new Date(String(programaPayload.inicio)) : null,
            endDate: programaPayload.fin ? new Date(String(programaPayload.fin)) : null,
            programaId: createdProg._id || createdProg.id || null,
          };

          // Enviar PATCH con weeklyTasks actualizado
          const patchRes = await fetch(`/api/proyectos/${projectId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ weeklyTasks: [...existing, newTaskForProject] }) });
          if (!patchRes.ok) {
            console.warn("No se pudo agregar la tarea al proyecto:", await patchRes.text());
          }
        }
      }

      // Limpiar UI
      setTaskFotos([]);
      setOpenCreateTask(false);
      setTaskErrors({});
      mutate(); // recargar lista de programas
      alert("Tarea creada correctamente");
    } catch (err: any) {
      alert(`Error creando tarea: ${err?.message || err}`);
    } finally {
      setTaskSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="sticky top-0 z-40 bg-[color:var(--surface)]/90 backdrop-blur border-b">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2 text-sm overflow-x-auto whitespace-nowrap -mx-1 px-1">
            <span className="px-3 py-1 rounded border bg-white/5">Tareas</span>
          </div>
        </div>
      </div>

      <h1 className="text-2xl font-bold">Tareas</h1>

      {/* Buscar */}
      <div>
        <input className="w-full input" placeholder="Buscar..." value={q} onChange={(e)=>setQ(e.target.value)} />
      </div>

      {/* Listado por ficha */}
      <div className="space-y-6">
        {visibles.map((f) => {
          const fid = f._id || f.id || "";
          const items = (programasPorFicha.mapa.get(String(fid)) || []) as Programa[];
          return (
            <div key={String(fid)}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold uppercase tracking-wide">{f.titulo}</div>
                <button className="inline-flex items-center gap-2 btn" onClick={() => openForFicha(f)}>
                  <PlusIcon className="w-5 h-5" /> Agregar nuevo
                </button>
              </div>
              {items.length === 0 ? (
                <div className="text-sm text-[color:var(--muted)]">Sin registros.</div>
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

        {/* Sección para programas/tareas sin ficha asociada */}
        {programasPorFicha.unassigned && programasPorFicha.unassigned.length > 0 && (
          <div key="__sin-ficha">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold uppercase tracking-wide">Generales</div>
              <div />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {programasPorFicha.unassigned.map((p) => {
                const isDone = !!p.completadoFecha;
                const hasAdj = !!(p as any).fichaId?.pdfId;
                return (
                  <div key={p._id} className="card overflow-hidden cursor-pointer" onClick={() => openEdit(p)}>
                    <div className="px-3 py-2 text-sm flex items-start justify-between bg-[color:var(--surface-2)] border-b border-[color:var(--border)]">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {p.voluntarioId ? `${(p.voluntarioId as any)?.nombre} ${(p.voluntarioId as any)?.apellido}` : "(sin supervisor)"}
                        </div>
                        <div className="text-xs text-[color:var(--muted)] truncate">
                          Técnico {p.ayudanteId ? `· ${(p.ayudanteId as any)?.nombre} ${(p.ayudanteId as any)?.apellido}` : "(ninguno)"}
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
          </div>
        )}
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

      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={() => setOpenCreateTask(true)}>➕ Nueva tarea</button>
        {/* ...existing Nuevo button for projects stays ... */}
      </div>

      {/* Modal crear tarea general */}
      {openCreateTask && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpenCreateTask(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="card w-[95vw] max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-4 py-3 card-header flex items-center gap-2">
                <div className="font-semibold">Crear nueva tarea</div>
                <button className="ml-auto btn btn-ghost" onClick={() => setOpenCreateTask(false)} aria-label="Cerrar">Cerrar</button>
              </div>
              <form onSubmit={crearTareaGeneral} className="flex-1 overflow-auto p-4 space-y-4">
                <div>
                  <label className="block text-sm mb-1">Título de la tarea *</label>
                  <input name="titulo" className={`w-full input ${taskErrors.titulo ? 'border-red-500 ring-1 ring-red-300' : ''}`} />
                  {taskErrors.titulo && <div className="text-sm text-red-500 mt-1">{taskErrors.titulo}</div>}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm mb-1">Asignado a (Supervisor) *</label>
                    <select name="voluntarioId" className={`select ${taskErrors.voluntarioId ? 'border-red-500 ring-1 ring-red-300' : ''}`} defaultValue="">
                      <option value="" disabled>No seleccionado</option>
                      {voluntarios.map((v) => (<option key={v._id || (v as any).id} value={v._id || (v as any).id}>{v.nombre} {v.apellido}</option>))}
                    </select>
                    {taskErrors.voluntarioId && <div className="text-sm text-red-500 mt-1">{taskErrors.voluntarioId}</div>}
                  </div>

                  <div>
                    <label className="block text-sm mb-1">Técnico</label>
                    <select name="ayudanteId" className="select" defaultValue="">
                      <option value="">No seleccionado</option>
                      {voluntarios.map((v) => (<option key={v._id || v.id} value={v._id || v.id}>{v.nombre} {v.apellido}</option>))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-sm">Fecha de asignación *</label>
                    <input type="date" name="asignadoFecha" className={`input mt-1 ${taskErrors.asignadoFecha ? 'border-red-500 ring-1 ring-red-300' : ''}`} />
                    {taskErrors.asignadoFecha && <div className="text-sm text-red-500 mt-1">{taskErrors.asignadoFecha}</div>}
                  </div>
                  <div>
                    <label className="text-sm">Fecha inicio</label>
                    <input type="date" name="startDate" className="input mt-1" />
                  </div>
                  <div>
                    <label className="text-sm">Fecha fin</label>
                    <input type="date" name="endDate" className="input mt-1" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-1">Notas</label>
                  <textarea name="notas" className="w-full textarea min-h-[120px]" />
                </div>

                <div>
                  <label className="block text-sm mb-1">Proyecto (opcional)</label>
                  <div className="flex gap-2 items-center">
                    <select name="projectId" className="select flex-1" defaultValue="">
                      <option value="">No vinculado</option>
                      {proyectos.map((pr) => (<option key={pr._id} value={pr._id}>{pr.titulo}</option>))}
                    </select>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={creatingProject} onChange={(e)=> setCreatingProject(e.target.checked)} /> Crear proyecto nuevo
                    </label>
                  </div>

                  {creatingProject && (
                    <div className="mt-2">
                      <input name="newProjectTitle" className={`w-full input ${taskErrors.newProjectTitle ? 'border-red-500 ring-1 ring-red-300' : ''}`} placeholder="Título del nuevo proyecto" />
                      {taskErrors.newProjectTitle && <div className="text-sm text-red-500 mt-1">{taskErrors.newProjectTitle}</div>}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm mb-1">Fotos de apoyo</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {taskFotos.map((id) => (
                      <div key={id} className="relative w-20 h-20 border rounded overflow-hidden bg-[color:var(--surface-2)]">
                        <img src={`/api/images/${id}`} alt="foto" className="w-full h-full object-cover" />
                        <button type="button" className="absolute top-0 right-0 bg-black/60 text-white text-xs px-1" onClick={() => removeTaskFoto(id)}>x</button>
                      </div>
                    ))}
                  </div>
                  <input type="file" accept="image/*" onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return; const id = await uploadTaskImage(f); if (id) setTaskFotos((arr)=>[...arr, id]); e.currentTarget.value = "";
                  }} />
                </div>

                <div className="text-right">
                  <button type="submit" className="btn btn-primary" disabled={taskSaving}>{taskSaving?"Guardando...":"Crear tarea"}</button>
                  <button type="button" className="btn ml-2" onClick={() => setOpenCreateTask(false)}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
