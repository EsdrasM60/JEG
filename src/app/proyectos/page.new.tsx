"use client";
import useSWR from "swr";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";

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

type Project = { 
  _id: string; 
  titulo: string; 
  descripcion?: string; 
  estado: string; 
  fechaInicio?: string | null; 
  fechaFin?: string | null; 
  evidencias?: Evidencia[]; 
  voluntarioId?: string | null; 
  ayudanteId?: string | null; 
  checklist?: Array<{ text: string; done: boolean }>; 
  etiquetas?: string[] 
};

type Volunteer = { _id?: string; id?: string; nombre: string; apellido: string };

export default function ProyectosPage() {
  const { data, mutate } = useSWR<{ items: Project[] }>("/api/proyectos?page=1&pageSize=100", fetcher);
  const { data: voluntariosResp } = useSWR<any>("/api/voluntarios", fetcher);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

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

  // Lista filtrada para búsqueda
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

  // Utilidades para formato y progreso
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
  
  function countPuntos(p: Project) {
    const list = Array.isArray(p.checklist) ? p.checklist : [];
    return list.length;
  }
  
  function countDone(p: Project) {
    const list = Array.isArray(p.checklist) ? p.checklist : [];
    return list.filter(i => i?.done).length;
  }
  
  // Detectar retraso
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

  const [evidencias, setEvidencias] = useState<Array<{ mediaId: string; thumbId?: string; titulo?: string; puntos: string[]; thumbUrl: string }>>([]);
  const fileRefCreate = useRef<HTMLInputElement>(null);
  const [createChecklistList, setCreateChecklistList] = useState<Array<{ text: string; done: boolean }>>([]);
  const [createChecklistInput, setCreateChecklistInput] = useState("");

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
      checklist: createChecklistList,
    };
    await fetch("/api/proyectos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setOpen(false);
    setEvidencias([]);
    setCreateChecklistList([]);
    setCreateChecklistInput("");
    mutate();
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

  function actualizarPuntos(idx: number, text: string) {
    const puntos = text.split(/\r?\n|,|;/).map(s=>s.trim()).filter(Boolean);
    setEvidencias(prev => prev.map((ev, i) => i === idx ? { ...ev, puntos } : ev));
  }

  function actualizarTitulo(idx: number, titulo: string) {
    setEvidencias(prev => prev.map((ev, i) => i === idx ? { ...ev, titulo } : ev));
  }

  function quitarEvidencia(idx: number) {
    setEvidencias(prev => prev.filter((_, i) => i !== idx));
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
              className="card p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-[color:var(--muted)] mb-1">
                    <span>Proyecto</span>
                    {isLate(p) && (
                      <span className="badge badge-danger">Con retraso</span>
                    )}
                  </div>
                  {/* Título del proyecto ahora es un enlace */}
                  <Link 
                    href={`/proyectos/${p._id}`}
                    className="text-left text-lg font-semibold hover:underline truncate block"
                  >
                    {p.titulo}
                  </Link>
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
                    <Link 
                      href={`/proyectos/${p._id}`}
                      className="btn btn-ghost text-sm"
                      title="Ver proyecto"
                    >
                      Abrir
                    </Link>
                    <Link 
                      href={`/proyectos/${p._id}/configuracion`}
                      className="btn btn-ghost text-sm"
                      title="Configurar"
                    >
                      Configurar
                    </Link>
                    <button 
                      className="btn text-sm" 
                      style={{ borderColor: "#ef444455", color: "#ef4444" }} 
                      title="Eliminar" 
                      onClick={(e)=>{ e.stopPropagation(); remove(p._id); }}
                    >
                      Eliminar
                    </button>
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

                {/* Evidencias iniciales */}
                <div className="space-y-2">
                  <div className="font-medium">Evidencias iniciales (opcional)</div>
                  <input ref={fileRefCreate} type="file" accept="image/*" multiple onChange={onUploadChange} className="hidden" />
                  <button type="button" onClick={()=>fileRefCreate.current?.click()} className="btn btn-ghost" title="Seleccionar fotos">Agregar fotos</button>
                  {evidencias.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {evidencias.map((ev, idx) => (
                        <div key={idx} className="border border-[color:var(--border)] rounded p-2 space-y-2">
                          <img src={ev.thumbUrl} alt={ev.titulo || "evidencia"} className="w-full h-32 object-cover rounded" />
                          <input value={ev.titulo || ""} onChange={(e)=>actualizarTitulo(idx, e.target.value)} className="w-full input text-sm" placeholder="Título de la foto" />
                          <textarea onChange={(e)=>actualizarPuntos(idx, e.target.value)} className="w-full textarea text-sm min-h-[60px]" placeholder="Puntos a tratar (uno por línea)"></textarea>
                          <button type="button" className="text-sm" style={{ color: "#ef4444" }} onClick={()=>quitarEvidencia(idx)}>Quitar</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Checklist inicial */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Lista de verificación inicial (opcional)</div>
                  <div className="space-y-1">
                    {createChecklistList.map((item, idx) => (
                      <label key={`${item.text}-${idx}`} className="flex items-center gap-2 text-sm select-none">
                        <input type="checkbox" checked={!!item.done} onChange={(e) => { 
                          const checked = e.currentTarget.checked; 
                          setCreateChecklistList(prev => prev.map((it, i) => i === idx ? { ...it, done: checked } : it)); 
                        }} />
                        <span className={item.done ? "line-through opacity-70" : ""}>{item.text}</span>
                        <button type="button" onClick={() => setCreateChecklistList(prev => prev.filter((_, i) => i !== idx))} className="ml-auto text-red-600">✕</button>
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="text" value={createChecklistInput} onChange={(e)=> setCreateChecklistInput(e.target.value)} className="flex-1 input" placeholder="Ej. Revisar bomba" />
                    <button type="button" className="btn" title="Agregar ítem" onClick={() => { 
                      const t = createChecklistInput.trim(); 
                      if (!t) return; 
                      setCreateChecklistList(prev => [...prev, { text: t, done: false }]); 
                      setCreateChecklistInput(""); 
                    }}>➕</button>
                  </div>
                </div>

                <div className="text-right">
                  <button type="submit" className="btn btn-primary">Crear proyecto</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
