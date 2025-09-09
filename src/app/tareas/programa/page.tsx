"use client";
import useSWR from "swr";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, PrinterIcon, CheckCircleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Programa = {
  _id: string;
  fichaId: any;
  voluntarioId: any;
  ayudanteId?: any;
  asignadoFecha: string;
  completadoFecha?: string | null;
  notas?: string | null;
};

type Ficha = { _id: string; id?: string; titulo: string };

type Volunteer = { _id: string; nombre: string; apellido: string };

export default function ProgramaPage() {
  const { data: lista } = useSWR<{ items: Programa[] }>("/api/tareas/programa?page=1&pageSize=1000", fetcher);
  const yearNow = new Date().getFullYear();
  const [year, setYear] = useState<number>(yearNow);
  const [q, setQ] = useState("");

  function yearOf(d: string | null | undefined) {
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt as any) ? null : dt.getFullYear();
    }

  const filteredByYear = useMemo(() => {
    const items = lista?.items || [];
    return items.filter((p) => {
      const refYear = yearOf(p.completadoFecha || p.asignadoFecha);
      if (refYear !== year) return false;
      if (!q.trim()) return true;
      const hay = `${p.fichaId?.titulo || ""} ${p.voluntarioId?.nombre || ""} ${p.voluntarioId?.apellido || ""} ${p.ayudanteId?.nombre || ""} ${p.ayudanteId?.apellido || ""} ${p.notas || ""}`
        .toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [lista, year, q]);

  // Agrupar por ficha
  const grupos = useMemo(() => {
    const m = new Map<string, { fichaTitulo: string; items: Programa[] }>();
    for (const p of filteredByYear) {
      const id = p.fichaId?._id || p.fichaId?.id || "sin";
      const titulo = p.fichaId?.titulo || "(Sin título)";
      if (!m.has(id)) m.set(id, { fichaTitulo: titulo, items: [] });
      m.get(id)!.items.push(p);
    }
    // ordenar items por fecha (completado o asignado) desc
    for (const g of m.values()) {
      g.items.sort((a, b) => new Date(b.completadoFecha || b.asignadoFecha).getTime() - new Date(a.completadoFecha || a.asignadoFecha).getTime());
    }
    // ordenar grupos por título
    return Array.from(m.entries()).sort((a, b) => a[1].fichaTitulo.localeCompare(b[1].fichaTitulo, 'es', { sensitivity: 'base' }));
  }, [filteredByYear]);

  function fmt(d?: string | null) {
    if (!d) return "";
    try { return new Date(d).toLocaleDateString(); } catch { return d || ""; }
  }

  return (
    <section className="space-y-4">
      {/* Barra de navegación fija */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-4 text-sm">
            <span className="px-3 py-1 rounded border bg-neutral-100">Programa</span>
            <Link href="/tareas/fichas" className="px-3 py-1 rounded border">Fichas</Link>
          </div>
          <button className="inline-flex items-center gap-2 px-3 py-1 rounded border" onClick={() => window.print()}>
            <PrinterIcon className="w-5 h-5" /> Imprimir
          </button>
        </div>
      </div>

      {/* Año y navegación */}
      <div className="flex items-center justify-center gap-2">
        <button className="border rounded p-1" onClick={() => setYear((y) => y - 1)} aria-label="Anterior"><ChevronLeftIcon className="w-5 h-5" /></button>
        <button className="border rounded px-3 py-1 inline-flex items-center gap-2" onClick={() => setYear(yearNow)} title="Ir al año actual">
          <CalendarIcon className="w-5 h-5" />
          <span className="font-medium">{year}</span>
        </button>
        <button className="border rounded p-1" onClick={() => setYear((y) => y + 1)} aria-label="Siguiente"><ChevronRightIcon className="w-5 h-5" /></button>
      </div>

      {/* Buscar */}
      <div>
        <input className="w-full border rounded px-3 py-2" placeholder="Buscar..." value={q} onChange={(e)=>setQ(e.target.value)} />
      </div>

      {/* Grupos por ficha */}
      <div className="space-y-6">
        {grupos.map(([id, g]) => (
          <div key={id}>
            <div className="font-semibold uppercase tracking-wide mb-2">{g.fichaTitulo}</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((p) => {
                const isDone = !!p.completadoFecha;
                return (
                  <div key={p._id} className="border rounded overflow-hidden">
                    <div className="bg-neutral-200 px-3 py-2 text-sm flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {p.voluntarioId ? `${p.voluntarioId?.nombre} ${p.voluntarioId?.apellido}` : "(sin supervisor)"}
                        </div>
                        <div className="text-xs text-neutral-700 truncate">
                          Técnico {p.ayudanteId ? `· ${p.ayudanteId?.nombre} ${p.ayudanteId?.apellido}` : "(ninguno)"}
                        </div>
                      </div>
                      <InformationCircleIcon className="w-5 h-5 text-neutral-600 ml-2" />
                    </div>
                    <div className="px-3 py-3 text-sm bg-white">
                      <div className="font-semibold flex items-center gap-2">
                        {isDone ? "Fecha que se completó" : "Fecha asignada"}
                        {isDone ? <CheckCircleIcon className="w-5 h-5 text-green-600" /> : null}
                      </div>
                      <div className="mb-2">{fmt(p.completadoFecha || p.asignadoFecha)}</div>
                      {p.notas ? (
                        <div className="text-neutral-700 whitespace-pre-wrap" style={{wordBreak:'break-word'}}>{p.notas}</div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {grupos.length === 0 && (
          <div className="text-sm text-neutral-500">No hay registros para {year}.</div>
        )}
      </div>
    </section>
  );
}
