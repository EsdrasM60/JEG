"use client";
import useSWR from "swr";
import { useMemo, useState } from "react";
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

type Project = { 
  _id: string; 
  titulo: string; 
  descripcion?: string; 
  estado: string; 
  fechaInicio?: string | null; 
  fechaFin?: string | null; 
  voluntarioId?: string | null; 
  ayudanteId?: string | null; 
  checklist?: Array<{ text: string; done: boolean }>; 
};

type Volunteer = { _id?: string; id?: string; nombre: string; apellido: string };

export default function ProyectosPage() {
  const { data, mutate } = useSWR<{ items: Project[] }>("/api/proyectos?page=1&pageSize=100", fetcher);
  const { data: voluntariosResp } = useSWR<any>("/api/voluntarios", fetcher);
  const [q, setQ] = useState("");

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
  
  function isLate(p: Project) {
    if (!p.fechaFin || p.estado === "COMPLETADO") return false;
    try { return new Date(p.fechaFin) < new Date(); } catch { return false; }
  }
  
  function percent(p: Project) {
    const total = countPuntos(p);
    const done = countDone(p);
    if (total > 0) return Math.round((done / total) * 100);
    if (p.estado === "COMPLETADO") return 100;
    if (p.estado === "EN_PROGRESO") return 25;
    return 0;
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar proyecto?")) return;
    await fetch(`/api/proyectos/${id}`, { method: "DELETE" });
    mutate();
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proyectos</h1>
        <Link href="/proyectos/nuevo" className="btn btn-primary">
          Nuevo proyecto
        </Link>
      </div>
      
      <div>
        <input 
          className="w-full input" 
          placeholder="Buscar proyectos..." 
          value={q} 
          onChange={(e) => setQ(e.target.value)} 
        />
      </div>
      
      {visibles.length === 0 ? (
        <div className="text-sm text-[color:var(--muted)]">Sin proyectos.</div>
      ) : (
        <ul className="space-y-3">
          {visibles.map((p) => (
            <li key={p._id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-[color:var(--muted)] mb-1">
                    <span>Proyecto</span>
                    {isLate(p) && (
                      <span className="badge badge-danger">Con retraso</span>
                    )}
                  </div>
                  
                  <Link 
                    href={`/proyectos/${p._id}`}
                    className="text-left text-lg font-semibold hover:underline truncate block"
                  >
                    {p.titulo}
                  </Link>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                    <div>
                      <div className="text-xs text-[color:var(--muted)]">Persona asignada</div>
                      <div className="text-sm">
                        {p.voluntarioId ? (volMap.get(p.voluntarioId) || "Asignado") : "Sin asignar"}
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
                    <div className="progress">
                      <span style={{ width: `${percent(p)}%` }} />
                    </div>
                    <div className="mt-1 text-right text-xs text-[color:var(--muted)]">
                      {percent(p)}%
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1 flex-wrap justify-end">
                    <span className={`status-${p.estado}`}>
                      {p.estado.replace("_", " ")}
                    </span>
                    
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
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        remove(p._id); 
                      }}
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
    </section>
  );
}
