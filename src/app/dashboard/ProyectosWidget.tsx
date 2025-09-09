"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

export type ProyectoItem = {
  _id: string;
  titulo: string;
  descripcion?: string | null;
  estado: "PLANIFICADO" | "EN_PROGRESO" | "EN_PAUSA" | "COMPLETADO";
  voluntario?: string | null; // nombre completo
  ayudante?: string | null; // nombre completo
  fechaInicio?: string | null;
  fechaFin?: string | null;
  checklist?: Array<{ text: string; done: boolean }>;
};

export default function ProyectosWidget({ items, isAdmin, userName }: { items: ProyectoItem[]; isAdmin: boolean; userName?: string | null }) {
  const [q, setQ] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(true);
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");
  const [estado, setEstado] = useState<"TODOS" | "PLANIFICADO" | "EN_PROGRESO" | "EN_PAUSA" | "COMPLETADO">("TODOS");

  const mine = (p: ProyectoItem) => {
    const full = (userName || "").trim().toLowerCase();
    if (!full) return false;
    const v = (p.voluntario || "").toLowerCase();
    const a = (p.ayudante || "").toLowerCase();
    return v === full || a === full || v.includes(full) || a.includes(full);
  };

  function parseDate(s?: string | null) {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function targetDate(p: ProyectoItem) {
    return parseDate(p.fechaFin) || parseDate(p.fechaInicio);
  }

  function countDone(p: ProyectoItem) {
    const list = Array.isArray(p.checklist) ? p.checklist : [];
    return list.filter((i) => i?.done).length;
  }
  function countTotal(p: ProyectoItem) {
    const list = Array.isArray(p.checklist) ? p.checklist : [];
    return list.length;
  }

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const dDesde = parseDate(desde);
    const dHasta = parseDate(hasta);
    return items.filter((p) => {
      if (!isAdmin && !mine(p)) return false;
      if (soloPendientes && p.estado === "COMPLETADO") return false;
      if (estado !== "TODOS" && p.estado !== estado) return false;
      const td = targetDate(p);
      if (dDesde && td && td < dDesde) return false;
      if (dHasta && td && td > dHasta) return false;
      if (qq) {
        const hay = `${p.titulo || ""} ${p.descripcion || ""} ${p.voluntario || ""} ${p.ayudante || ""}`.toLowerCase();
        if (!hay.includes(qq)) return false;
      }
      return true;
    });
  }, [items, q, soloPendientes, estado, desde, hasta, isAdmin, userName]);

  return (
    <div className="card">
      <div className="px-4 py-3 card-header flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Proyectos</h2>
          <div className="text-sm text-[color:var(--muted)]">{filtered.length}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input className="input" placeholder="Buscar..." value={q} onChange={(e)=>setQ(e.target.value)} />
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={soloPendientes} onChange={(e)=>setSoloPendientes(e.target.checked)} />
            <span>Solo pendientes</span>
          </label>
          <label className="flex items-center gap-1">
            <span>Desde</span>
            <input type="date" className="input" value={desde} onChange={(e)=>setDesde(e.target.value)} />
          </label>
          <label className="flex items-center gap-1">
            <span>Hasta</span>
            <input type="date" className="input" value={hasta} onChange={(e)=>setHasta(e.target.value)} />
          </label>
          <select className="input" value={estado} onChange={(e)=>setEstado(e.target.value as any)}>
            <option value="TODOS">Todos</option>
            <option value="PLANIFICADO">Sin empezar</option>
            <option value="EN_PROGRESO">En curso</option>
            <option value="EN_PAUSA">En pausa</option>
            <option value="COMPLETADO">Completado</option>
          </select>
          <Link href="/proyectos" className="ml-auto btn btn-ghost">Ir a Proyectos</Link>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="p-4 text-sm text-[color:var(--muted)]">Sin elementos.</div>
      ) : (
        <ul className="divide-y divide-[color:var(--border)]">
          {filtered.slice(0, 12).map((p) => {
            const done = countDone(p);
            const total = countTotal(p);
            const pct = total ? Math.round((done/Math.max(total,1))*100) : 0;
            return (
              <li key={p._id} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.titulo}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-[color:var(--muted)] truncate">
                    <span className={`status-${p.estado}`}>{p.estado.replace("_"," ")}</span>
                    <span className="truncate">
                      {p.voluntario || "(sin supervisor)"}
                      {p.ayudante ? ` · Técnico: ${p.ayudante}` : ""}
                    </span>
                  </div>
                </div>
                <div className="text-right text-sm text-[color:var(--foreground)] min-w-[200px]">
                  <div>
                    {p.fechaInicio ? new Date(p.fechaInicio).toLocaleDateString() : ""}
                    {p.fechaFin ? ` – ${new Date(p.fechaFin).toLocaleDateString()}` : ""}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="progress flex-1"><span style={{ width: `${pct}%` }} /></div>
                    <div className="text-xs text-[color:var(--muted)]">{done} / {total}</div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
