"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

export type ProgramaItem = {
  _id: string;
  fichaId: { titulo?: string; pdfId?: string | null } | null;
  voluntarioId?: { nombre?: string; apellido?: string } | null;
  ayudanteId?: { nombre?: string; apellido?: string } | null;
  asignadoFecha: string;
  completadoFecha?: string | null;
  notas?: string | null;
};

export default function ProgramasPendientesWidget({ items, isAdmin, userName }: { items: ProgramaItem[]; isAdmin: boolean; userName?: string | null }) {
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");
  const [q, setQ] = useState<string>("");

  const mine = (p: ProgramaItem) => {
    const full = (userName || "").trim().toLowerCase();
    if (!full) return false;
    const v = `${p.voluntarioId?.nombre || ""} ${p.voluntarioId?.apellido || ""}`.trim().toLowerCase();
    const a = `${p.ayudanteId?.nombre || ""} ${p.ayudanteId?.apellido || ""}`.trim().toLowerCase();
    return v === full || a === full || v.includes(full) || a.includes(full);
  };

  function parseDate(s?: string | null) {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  const filtered = useMemo(() => {
    const dDesde = parseDate(desde);
    const dHasta = parseDate(hasta);
    const qq = q.trim().toLowerCase();
    return items.filter((p) => {
      const pendiente = !p.completadoFecha;
      if (!pendiente) return false;
      if (!isAdmin && !mine(p)) return false;
      const target = parseDate(p.asignadoFecha);
      if (dDesde && target && target < dDesde) return false;
      if (dHasta && target && target > dHasta) return false;
      if (qq) {
        const hay = `${p.fichaId?.titulo || ""} ${p.voluntarioId?.nombre || ""} ${p.voluntarioId?.apellido || ""} ${p.ayudanteId?.nombre || ""} ${p.ayudanteId?.apellido || ""} ${p.notas || ""}`.toLowerCase();
        if (!hay.includes(qq)) return false;
      }
      return true;
    });
  }, [items, desde, hasta, q, isAdmin, userName]);

  return (
    <div className="card">
      <div className="px-4 py-3 card-header flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Asignaciones pendientes</h2>
          <div className="text-sm text-[color:var(--muted)]">{filtered.length}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input className="input" placeholder="Buscar..." value={q} onChange={(e)=>setQ(e.target.value)} />
          <label className="flex items-center gap-1">
            <span>Desde</span>
            <input type="date" className="input" value={desde} onChange={(e)=>setDesde(e.target.value)} />
          </label>
          <label className="flex items-center gap-1">
            <span>Hasta</span>
            <input type="date" className="input" value={hasta} onChange={(e)=>setHasta(e.target.value)} />
          </label>
          <Link href="/tareas" className="ml-auto btn btn-ghost">Ir a Tareas</Link>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="p-4 text-sm text-[color:var(--muted)]">Sin pendientes.</div>
      ) : (
        <ul className="divide-y divide-[color:var(--border)]">
          {filtered.slice(0, 15).map((p) => (
            <li key={p._id} className="px-4 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium truncate">{p.fichaId?.titulo || "(sin título)"}</div>
                <div className="mt-1 text-xs text-[color:var(--muted)] truncate">
                  {p.voluntarioId ? `${p.voluntarioId?.nombre} ${p.voluntarioId?.apellido}` : "(sin supervisor)"}
                  {p.ayudanteId ? ` · Técnico: ${p.ayudanteId?.nombre} ${p.ayudanteId?.apellido}` : ""}
                </div>
              </div>
              <div className="text-right text-sm text-[color:var(--foreground)] min-w-[200px]">
                <div>Para: {new Date(p.asignadoFecha).toLocaleDateString()}</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="progress flex-1"><span style={{ width: `0%` }} /></div>
                  <div className="text-xs text-[color:var(--muted)]">Pendiente</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
