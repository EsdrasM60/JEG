"use client";
import useSWR from "swr";
import { useMemo, useRef, useState, useEffect } from "react";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

type Evidencia = { mediaId: string; thumbId?: string; titulo?: string; puntos: string[] };

// Extender tipo con asignaciones
type Project = { _id: string; titulo: string; descripcion?: string; estado: string; fechaInicio?: string | null; fechaFin?: string | null; evidencias?: Evidencia[]; voluntarioId?: string | null; ayudanteId?: string | null; checklist?: Array<{ text: string; done: boolean }>; etiquetas?: string[] };

type Volunteer = { _id?: string; id?: string; nombre: string; apellido: string };

export default function ProyectosPage() {
  const { data, mutate } = useSWR<{ items: Project[] }>("/api/proyectos?page=1&pageSize=100", fetcher);
  const { data: voluntariosResp } = useSWR<any>("/api/voluntarios", fetcher);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Project | null>(null);
  const [view, setView] = useState<Project | null>(null);
  // Cargar detalle cuando se abre Ver (para asegurar evidencias)
  const { data: viewFull } = useSWR(view?._id ? `/api/proyectos/${view._id}` : null, fetcher);
  const viewData: Project | null = (viewFull as any) || view;

  const proyectos = useMemo(() => (data?.items || []), [data]);
  const voluntarios = useMemo(() => {
    const resp = voluntariosResp;
    if (Array.isArray(resp)) return resp as Volunteer[];
    return (resp?.items || []) as Volunteer[];
  }, [voluntariosResp]);

  const volMap = useMemo(() => {
    const m = new Map<string, string>();
    (voluntarios || []).forEach((v: any) => {
      const id = (v?._id || v?.id) as string | undefined;
      if (id) m.set(id, `${v.nombre} ${v.apellido}`.trim());
    });
    return m;
  }, [voluntarios]);

  // NUEVO: lista filtrada para búsqueda
  const visibles = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (proyectos || []).filter((p) => {
      if (!query) return true;
      return (
        (p.titulo || "").toLowerCase().includes(query) ||
        (p.descripcion || "").toLowerCase().includes(query)
      );
    });
  }, [proyectos, q]);

  // NUEVO: utilidades para formato y progreso
  function fmtDate(d?: string | null) {
    if (!d) return "";
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }).replace(/\.$/, "");
    } catch {
      return String(d);
    }
  }
  function fmtRange(i?: string | null, f?: string | null) {
    if (!i && !f) return "—";
    if (i && f) return `${fmtDate(i)} – ${fmtDate(f)}`;
    return fmtDate(i || f || "");
  }
  // Nuevo: formatear valor para input date (yyyy-mm-dd)
  function toDateInputValue(d?: string | null) {
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  function countPuntos(p: Project) {
    const list = Array.isArray(p.checklist) ? p.checklist : [];
    return list.length;
  }
  function countDone(p: Project) {
    const list = Array.isArray(p.checklist) ? p.checklist : [];
    return list.filter(i => i?.done).length;
  }
  // NUEVO: detectar retraso
  function isLate(p: Project) {
    if (!p.fechaFin || p.estado === "COMPLETADO") return false;
    try { return new Date(p.fechaFin) < new Date(); } catch { return false; }
  }
  function percent(p: Project) {
    const total = countPuntos(p);
    const done = countDone(p);
    if (total > 0) return Math.round((done / total) * 100);
    // fallback por estado si no hay checklist
    if (p.estado === "COMPLETADO") return 100;
    if (p.estado === "EN_PROGRESO") return 25;
    return 0;
  }
  function ProgressRing({ value }: { value: number }) {
    const angle = Math.max(0, Math.min(100, value)) * 3.6;
    return (
      <div className="relative w-12 h-12" title={`${value}%`}>
        <div
          className="w-12 h-12 rounded-full"
          style={{ background: `conic-gradient(#16a34a ${angle}deg, #e5e7eb 0deg)` }}
        />
        <div className="absolute inset-0 grid place-items-center text-xs font-semibold text-neutral-800">
          {value}%
        </div>
      </div>
    );
  }

  const [evidencias, setEvidencias] = useState<Array<{ mediaId: string; thumbId?: string; titulo?: string; puntos: string[]; thumbUrl: string }>>([]);
  const [evidenciasEditNew, setEvidenciasEditNew] = useState<Array<{ mediaId: string; thumbId?: string; titulo?: string; puntos: string[]; thumbUrl: string }>>([]);

  const fileRefCreate = useRef<HTMLInputElement>(null);
  const fileRefEdit = useRef<HTMLInputElement>(null);
  // Índices y estados para checklist (crear y editar)
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [createDragIndex, setCreateDragIndex] = useState<number | null>(null);
  // Editar: lista + input (como en crear)
  const [editChecklistList, setEditChecklistList] = useState<Array<{ text: string; done: boolean }>>([]);
  const [editChecklistInput, setEditChecklistInput] = useState("");
  // Crear: lista + input
  const [createChecklistList, setCreateChecklistList] = useState<Array<{ text: string; done: boolean }>>([]);
  const [createChecklistInput, setCreateChecklistInput] = useState("");

  useEffect(() => {
    if (edit) {
      const list = Array.isArray(edit.checklist) ? edit.checklist : [];
      setEditChecklistList(list);
      setEditChecklistInput("");
    } else {
      setEditChecklistList([]);
      setEditChecklistInput("");
    }
  }, [edit]);

  function onChecklistTextChange(val: string) {
    const texts = val.split(/\r?\n|,|;/).map(s=>s.trim()).filter(Boolean);
    const doneMap = new Map(editChecklistList.map(i => [i.text, i.done] as const));
    const list = texts.map((t) => ({ text: t, done: doneMap.get(t) ?? false }));
    setEditChecklistInput(val);
    setEditChecklistList(list);
  }

  async function crearProyecto(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      titulo: fd.get("titulo"),
      descripcion: fd.get("descripcion") || null,
      estado: fd.get("estado") || "PLANIFICADO",
      voluntarioId: fd.get("voluntarioId") || null,
      ayudanteId: fd.get("ayudanteId") || null,
      fechaInicio: fd.get("fechaInicio") || null,
      fechaFin: fd.get("fechaFin") || null,
      evidencias: evidencias.map(ev => ({ mediaId: ev.mediaId, thumbId: ev.thumbId, titulo: ev.titulo, puntos: ev.puntos })),
      // usar checklist con checkboxes del estado local
      checklist: createChecklistList,
    };
    await fetch("/api/proyectos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setOpen(false);
    setEvidencias([]);
    setCreateChecklistList([]);
    setCreateChecklistInput("");
    mutate();
  }

  async function changeEstado(id: string, estado: string) {
    await fetch(`/api/proyectos/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ estado }) });
    mutate();
  }

  async function patchProyecto(id: string, body: any) {
    const res = await fetch(`/api/proyectos/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(msg || `Error ${res.status}`);
    }
    await mutate();
  }

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edit) return;
    try {
      const fd = new FormData(e.currentTarget);
      const updates: any = {};

      const titulo = (fd.get("titulo") || "").toString();
      if (titulo && titulo !== edit.titulo) updates.titulo = titulo;

      const descripcion = (fd.get("descripcion") || "").toString();
      if (descripcion !== (edit.descripcion || "")) updates.descripcion = descripcion || null;

      const estado = (fd.get("estado") || "").toString();
      if (estado && estado !== edit.estado) updates.estado = estado;

      const voluntarioId = (fd.get("voluntarioId") || "").toString();
      if (voluntarioId !== (edit.voluntarioId || "")) updates.voluntarioId = voluntarioId || null;

      const ayudanteId = (fd.get("ayudanteId") || "").toString();
      if (ayudanteId !== (edit.ayudanteId || "")) updates.ayudanteId = ayudanteId || null;

      const fechaInicio = (fd.get("fechaInicio") || "").toString();
      if (fechaInicio) updates.fechaInicio = fechaInicio; // no enviar null para no borrar

      const fechaFin = (fd.get("fechaFin") || "").toString();
      if (fechaFin) updates.fechaFin = fechaFin;

      // checklist: siempre sincronizamos lo que hay en pantalla
      updates.checklist = editChecklistList;

      if (Object.keys(updates).length > 0) {
        const res = await fetch(`/api/proyectos/${edit._id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(updates) });
        if (!res.ok) throw new Error(await res.text().catch(()=>"Error al guardar"));
      }

      if (evidenciasEditNew.length > 0) {
        const addEvidencias = evidenciasEditNew.map(ev => ({ mediaId: ev.mediaId, thumbId: ev.thumbId, titulo: ev.titulo, puntos: ev.puntos }));
        const res2 = await fetch(`/api/proyectos/${edit._id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ addEvidencias }) });
        if (!res2.ok) throw new Error(await res2.text().catch(()=>"Error agregando evidencias"));
        setEvidenciasEditNew([]);
      }

      await mutate();
      setEdit(null);
    } catch (err: any) {
      alert(`No se pudo guardar: ${err?.message || err}`);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar proyecto?")) return;
    await fetch(`/api/proyectos/${id}`, { method: "DELETE" });
    mutate();
  }

  async function onUploadChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      if (!res.ok) continue;
      const json = await res.json();
      const thumbUrl = `/api/images/${json.thumbId}?thumb=1`;
      setEvidencias(prev => [...prev, { mediaId: json.id, thumbId: json.thumbId, titulo: file.name, puntos: [], thumbUrl }]);
    }
    e.currentTarget.value = "";
  }

  async function onUploadChangeEdit(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      if (!res.ok) continue;
      const json = await res.json();
      const thumbUrl = `/api/images/${json.thumbId}?thumb=1`;
      setEvidenciasEditNew(prev => [...prev, { mediaId: json.id, thumbId: json.thumbId, titulo: file.name, puntos: [], thumbUrl }]);
    }
    e.currentTarget.value = "";
  }

  function actualizarPuntos(idx: number, text: string) {
    const puntos = text.split(/\r?\n|,|;/).map(s=>s.trim()).filter(Boolean);
    setEvidencias(prev => prev.map((ev, i) => i === idx ? { ...ev, puntos } : ev));
  }

  function actualizarPuntosEdit(idx: number, text: string) {
    const puntos = text.split(/\r?\n|,|;/).map(s=>s.trim()).filter(Boolean);
    setEvidenciasEditNew(prev => prev.map((ev, i) => i === idx ? { ...ev, puntos } : ev));
  }

  function actualizarTitulo(idx: number, titulo: string) {
    setEvidencias(prev => prev.map((ev, i) => i === idx ? { ...ev, titulo } : ev));
  }

  function actualizarTituloEdit(idx: number, titulo: string) {
    setEvidenciasEditNew(prev => prev.map((ev, i) => i === idx ? { ...ev, titulo } : ev));
  }

  function quitarEvidencia(idx: number) {
    setEvidencias(prev => prev.filter((_, i) => i !== idx));
  }

  function quitarEvidenciaEdit(idx: number) {
    setEvidenciasEditNew(prev => prev.filter((_, i) => i !== idx));
  }

  function estadoBadge(estado: string) {
    const cls = estado === "COMPLETADO"
      ? "bg-green-100 text-green-800"
      : estado === "EN_PROGRESO"
        ? "bg-yellow-100 text-yellow-800"
        : "bg-gray-100 text-gray-800";
    return <span className={`text-xs px-2 py-1 rounded ${cls}`} title="Estado">{estado}</span>;
  }

  function estadoOptions() {
    return [
      { key: "PLANIFICADO", label: "Sin empezar", icon: "⏳", color: "text-blue-600", ring: "ring-blue-100" },
      { key: "EN_PROGRESO", label: "En curso", icon: "➕", color: "text-indigo-700", ring: "ring-indigo-100" },
      { key: "EN_PAUSA", label: "En pausa", icon: "⏸️", color: "text-yellow-600", ring: "ring-yellow-100" },
      { key: "COMPLETADO", label: "Completado", icon: "✅", color: "text-green-600", ring: "ring-green-100" },
    ] as const;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proyectos</h1>
        <button className="btn btn-primary" title="Nuevo proyecto" onClick={() => setOpen(true)}>Nuevo</button>
      </div>
      <div>
        <input className="w-full input" placeholder="Buscar proyectos..." value={q} onChange={(e)=>setQ(e.target.value)} />
      </div>
      {visibles.length === 0 ? (
        <div className="text-sm text-[color:var(--muted)]">Sin proyectos.</div>
      ) : (
        <ul className="space-y-3">
          {visibles.map((p) => (
            <li
              key={p._id}
              className="card p-4 cursor-pointer"
              onClick={() => setEdit(p)}
              role="button"
              aria-label={`Editar proyecto ${p.titulo}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-[color:var(--muted)] mb-1">
                    <span>Proyecto</span>
                    {isLate(p) && (
                      <span className="badge badge-danger">Con retraso</span>
                    )}
                  </div>
                  {/* Clic en el nombre abre edición */}
                  <button onClick={()=>setEdit(p)} className="text-left text-lg font-semibold hover:underline truncate">
                    {p.titulo}
                  </button>
                  {/* columnas de resumen */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                    <div>
                      <div className="text-xs text-[color:var(--muted)]">Persona asignada</div>
                      <div className="text-sm">
                        {p.voluntarioId ? (volMap.get(p.voluntarioId) || "Asignado") : "Sin asignar"}
                        {p.ayudanteId && (
                          <div className="opacity-80">{volMap.get(p.ayudanteId) || ""}</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[color:var(--muted)]">Calendario</div>
                      <div className="text-sm">{fmtRange(p.fechaInicio, p.fechaFin)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[color:var(--muted)]">Lista de verificación</div>
                      <div className="text-sm">{countDone(p)} de {countPuntos(p)} completado</div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 min-w-[160px]">
                  <div className="w-36 sm:w-48">
                    <div className="progress"><span style={{ width: `${percent(p)}%` }} /></div>
                    <div className="mt-1 text-right text-xs text-[color:var(--muted)]">{percent(p)}%</div>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap justify-end">
                    <span className={`status-${p.estado}`}>{p.estado.replace("_"," ")}</span>
                    <button className="btn btn-ghost text-sm" title="Ver" onClick={(e)=>{ e.stopPropagation(); setView(p); }}>Ver</button>
                    <button className="btn btn-ghost text-sm" title="Editar" onClick={(e)=>{ e.stopPropagation(); setEdit(p); }}>Editar</button>
                    <button className="btn text-sm" style={{ borderColor: "#ef444455", color: "#ef4444" }} title="Eliminar" onClick={(e)=>{ e.stopPropagation(); remove(p._id); }}>Eliminar</button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* MODAL CREAR */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="card w-[95vw] max-w-3xl max-h-[90vh] overflow-auto">
              <div className="px-4 py-3 card-header flex items-center gap-2">
                <div className="font-semibold">Nuevo proyecto</div>
                <button className="ml-auto btn btn-ghost" title="Cerrar" onClick={() => setOpen(false)}>Cerrar</button>
              </div>
              <form onSubmit={crearProyecto} className="p-4 space-y-4">
                <div className="grid gap-3">
                  <input name="titulo" placeholder="Título" className="w-full input" required />
                  <textarea name="descripcion" placeholder="Descripción" className="w-full textarea min-h-[100px]" />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-semibold">Estado</div>
                  <div className="grid gap-2">
                    {estadoOptions().map(opt => (
                      <label key={opt.key} className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] px-3 py-2.5 hover:bg-white/5 cursor-pointer" >
                        <input type="radio" name="estado" value={opt.key} defaultChecked={opt.key === "PLANIFICADO"} className="accent-[color:var(--brand)]" />
                        <span className={`${opt.color}`}>{opt.icon}</span>
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm">Fecha de inicio</label>
                    <input name="fechaInicio" type="text" placeholder="Fecha de inicio" className="w-full input" onFocus={(e)=>{ e.currentTarget.type = "date"; }} onBlur={(e)=>{ if (!e.currentTarget.value) e.currentTarget.type = "text"; }} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm">Fecha de finalización</label>
                    <input name="fechaFin" type="text" placeholder="Fecha de finalización" className="w-full input" onFocus={(e)=>{ e.currentTarget.type = "date"; }} onBlur={(e)=>{ if (!e.currentTarget.value) e.currentTarget.type = "text"; }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-semibold">Asignación</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm">Supervisor</label>
                      <select name="voluntarioId" className="select" defaultValue="">
                        <option value="">Sin asignar</option>
                        {voluntarios.map((v) => (<option key={v._id || v.id} value={v._id || v.id}>{v.nombre} {v.apellido}</option>))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm">Técnico</label>
                      <select name="ayudanteId" className="select" defaultValue="">
                        <option value="">Sin asignar</option>
                        {voluntarios.map((v) => (<option key={v._id || v.id} value={v._id || v.id}>{v.nombre} {v.apellido}</option>))}
                      </select>
                    </div>
                  </div>
                </div>
                {/* Evidencias y checklist quedan, pero con estilos base */}
                <div className="text-right">
                  <button type="submit" className="btn btn-primary">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {edit && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEdit(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="card w-[95vw] max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-4 py-3 card-header flex items-center gap-2">
                <div className="font-semibold">Editar proyecto</div>
                <button className="ml-auto btn btn-ghost" title="Cerrar" onClick={() => setEdit(null)}>Cerrar</button>
              </div>
              <form onSubmit={saveEdit} className="p-4 space-y-4 overflow-auto">
                <div className="grid gap-3">
                  <input name="titulo" placeholder="Título" className="w-full input" defaultValue={edit?.titulo || ""} required onBlur={async (e)=>{ if (edit && e.currentTarget.value !== edit.titulo) { try { await patchProyecto(edit._id, { titulo: e.currentTarget.value }); } catch (err:any){ alert(`Error guardando título: ${err?.message||err}`);} } }} />
                  <textarea name="descripcion" placeholder="Descripción" className="w-full textarea min-h-[100px]" defaultValue={edit?.descripcion || ""} onBlur={async (e)=>{ if (edit && e.currentTarget.value !== (edit.descripcion||"")) { try { await patchProyecto(edit._id, { descripcion: e.currentTarget.value||null }); } catch (err:any){ alert(`Error guardando descripción: ${err?.message||err}`);} } }} />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-semibold">Estado</div>
                  <div className="grid gap-2">
                    {estadoOptions().map(opt => (
                      <label key={opt.key} className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] px-3 py-2.5 hover:bg-white/5 cursor-pointer" >
                        <input type="radio" name="estado" value={opt.key} defaultChecked={opt.key === (edit?.estado || "PLANIFICADO")} className="accent-[color:var(--brand)]" onChange={async (e)=>{ if (edit) { try { await patchProyecto(edit._id, { estado: e.currentTarget.value }); } catch (err:any){ alert(`Error guardando estado: ${err?.message||err}`);} } }} />
                        <span className={`${opt.color}`}>{opt.icon}</span>
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm">Fecha de inicio</label>
                    <input name="fechaInicio" type="text" placeholder="Fecha de inicio" className="w-full input" defaultValue={toDateInputValue(edit?.fechaInicio)} onFocus={(e)=>{ e.currentTarget.type = "date"; }} onBlur={async (e)=>{ if (!e.currentTarget.value) { e.currentTarget.type = "text"; } if (edit) { try { await patchProyecto(edit._id, { fechaInicio: e.currentTarget.value || null }); } catch (err:any){ alert(`Error guardando fecha inicio: ${err?.message||err}`);} } }} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm">Fecha de finalización</label>
                    <input name="fechaFin" type="text" placeholder="Fecha de finalización" className="w-full input" defaultValue={toDateInputValue(edit?.fechaFin)} onFocus={(e)=>{ e.currentTarget.type = "date"; }} onBlur={async (e)=>{ if (!e.currentTarget.value) { e.currentTarget.type = "text"; } if (edit) { try { await patchProyecto(edit._id, { fechaFin: e.currentTarget.value || null }); } catch (err:any){ alert(`Error guardando fecha fin: ${err?.message||err}`);} } }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-semibold">Asignación</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm">Supervisor</label>
                      <select name="voluntarioId" className="select" defaultValue={edit?.voluntarioId || ""} onChange={async (e)=>{ if (edit) { try { await patchProyecto(edit._id, { voluntarioId: e.currentTarget.value || null }); } catch (err:any){ alert(`Error guardando voluntario: ${err?.message||err}`);} } }}>
                        <option value="">Sin asignar</option>
                        {voluntarios.map((v) => (<option key={v._id || v.id} value={v._id || v.id}>{v.nombre} {v.apellido}</option>))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm">Técnico</label>
                      <select name="ayudanteId" className="select" defaultValue={edit?.ayudanteId || ""} onChange={async (e)=>{ if (edit) { try { await patchProyecto(edit._id, { ayudanteId: e.currentTarget.value || null }); } catch (err:any){ alert(`Error guardando ayudante: ${err?.message||err}`);} } }}>
                        <option value="">Sin asignar</option>
                        {voluntarios.map((v) => (<option key={v._id || v.id} value={v._id || v.id}>{v.nombre} {v.apellido}</option>))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Evidencias existentes */}
                {Array.isArray(edit?.evidencias) && edit.evidencias.length > 0 && (
                  <div className="space-y-2">
                    <div className="font-medium">Evidencias existentes</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {edit.evidencias.map((ev, idx) => (
                        <div key={idx} className="border border-[color:var(--border)] rounded p-2 space-y-2">
                          <img src={`/api/images/${ev.thumbId || ev.mediaId}?thumb=1`} alt={ev.titulo || "evidencia"} className="w-full h-32 object-cover rounded" />
                          {ev.titulo && <div className="text-sm truncate" title={ev.titulo}>{ev.titulo}</div>}
                          <button type="button" className="text-xs" style={{ color: "#ef4444" }} title="Quitar evidencia" onClick={async ()=>{
                            if (!edit) return;
                            await patchProyecto(edit._id, { removeEvidenciaIds: [ev.mediaId] });
                            setEdit(prev => {
                              if (!prev) return prev as any;
                              const list = (Array.isArray((prev as any).evidencias) ? (prev as any).evidencias.filter((x:any)=> String(x.mediaId) !== String(ev.mediaId)) : []);
                              return ({ ...(prev as any), evidencias: list } as any);
                            });
                          }}>Quitar</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agregar nuevas evidencias */}
                <div className="space-y-2">
                  <div className="font-medium">Agregar nuevas evidencias</div>
                  <input ref={fileRefEdit} type="file" accept="image/*" multiple onChange={onUploadChangeEdit} className="hidden" />
                  <button type="button" onClick={()=>fileRefEdit.current?.click()} className="btn btn-ghost" title="Seleccionar fotos">Agregar fotos</button>
                  {evidenciasEditNew.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {evidenciasEditNew.map((ev, idx) => (
                        <div key={idx} className="border border-[color:var(--border)] rounded p-2 space-y-2">
                          <img src={ev.thumbUrl} alt={ev.titulo || "evidencia"} className="w-full h-32 object-cover rounded" />
                          <input value={ev.titulo || ""} onChange={(e)=>actualizarTituloEdit(idx, e.target.value)} className="w-full input text-sm" placeholder="Título de la foto" />
                          <textarea onChange={(e)=>actualizarPuntosEdit(idx, e.target.value)} className="w-full textarea text-sm min-h-[60px]" placeholder="Puntos a tratar (uno por línea)"></textarea>
                          <button type="button" className="text-sm" style={{ color: "#ef4444" }} onClick={()=>quitarEvidenciaEdit(idx)}>Quitar</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Checklist editable */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Lista de verificación</div>
                  <div className="space-y-1">
                    {editChecklistList.map((item, idx) => (
                      <label key={`${item.text}-${idx}`} className="flex items-center gap-2 text-sm select-none" draggable onDragStart={() => setDragIndex(idx)} onDragOver={(e)=> e.preventDefault()} onDrop={async () => { if (dragIndex === null || dragIndex === idx || !edit) return; const list = [...editChecklistList]; const [moved] = list.splice(dragIndex, 1); list.splice(idx, 0, moved); setDragIndex(null); setEditChecklistList(list); setEdit(prev => (prev ? ({ ...(prev as any), checklist: list } as any) : prev)); await fetch(`/api/proyectos/${edit._id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ checklist: list }) }); mutate(); }} title="Arrastra para reordenar">
                        <span className="cursor-grab text-[color:var(--muted)]">⠿</span>
                        <input type="checkbox" checked={!!item.done} onChange={async (e) => { if (!edit) return; const checked = e.currentTarget.checked; const newList = editChecklistList.map((it, i) => i === idx ? { ...it, done: checked } : it); setEditChecklistList(newList); setEdit((prev) => (prev ? ({ ...(prev as any), checklist: newList } as any) : prev)); await fetch(`/api/proyectos/${edit._id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ checklist: newList }) }); mutate(); }} />
                        <span className={item.done ? "line-through opacity-70" : ""}>{item.text}</span>
                      </label>
                    ))}
                    {editChecklistList.length === 0 && (
                      <div className="text-xs text-[color:var(--muted)]">Añade ítems y aparecerán aquí.</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="text" value={editChecklistInput} onChange={(e)=> setEditChecklistInput(e.target.value)} className="flex-1 input" placeholder="Ej. Revisar bomba" />
                    <button type="button" className="btn" title="Agregar ítem" onClick={async () => { if (!edit) return; const t = editChecklistInput.trim(); if (!t) return; const list = [...editChecklistList, { text: t, done: false }]; setEditChecklistList(list); setEditChecklistInput(""); setEdit(prev => (prev ? ({ ...(prev as any), checklist: list } as any) : prev)); await fetch(`/api/proyectos/${edit._id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ checklist: list }) }); mutate(); }}>➕</button>
                  </div>
                </div>

                <div className="text-right">
                  <button type="submit" className="btn btn-primary">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VER */}
      {viewData && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setView(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="card w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-4 py-3 card-header flex items-center gap-2">
                <div className="font-semibold">{viewData.titulo}</div>
                <button className="ml-auto btn btn-ghost" title="Cerrar" onClick={() => setView(null)}>Cerrar</button>
              </div>
              <div className="p-4 space-y-4 overflow-auto">
                {viewData.descripcion && <p className="text-sm opacity-90">{viewData.descripcion}</p>}
                {Array.isArray(viewData.evidencias) && viewData.evidencias.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewData.evidencias.map((ev, idx) => (
                      <div key={idx} className="border border-[color:var(--border)] rounded p-3 space-y-2">
                        <img src={`/api/images/${ev.thumbId || ev.mediaId}?thumb=1`} alt={ev.titulo || `Evidencia ${idx+1}`} className="w-full h-48 object-cover rounded" />
                        <div className="flex items-center justify-between gap-2">
                          {ev.titulo ? <div className="font-medium text-sm truncate" title={ev.titulo}>{ev.titulo}</div> : <div />}
                          <a className="btn btn-ghost text-sm" href={`/api/images/${ev.mediaId}`} target="_blank" rel="noreferrer" title="Ver original">Ver grande</a>
                        </div>
                        {Array.isArray(ev.puntos) && ev.puntos.length > 0 && (
                          <ul className="list-disc list-inside text-sm opacity-90">
                            {ev.puntos.map((punto, i) => (<li key={i}>{punto}</li>))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-[color:var(--muted)]">Sin evidencias.</div>
                )}
                {Array.isArray(viewData.checklist) && viewData.checklist.length > 0 && (
                  <div>
                    <div className="font-medium text-sm mb-2">Lista de verificación</div>
                    <div className="space-y-1">
                      {viewData.checklist.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={item.done} disabled className="cursor-pointer" />
                          <span className={item.done ? "line-through opacity-70" : ""}>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
