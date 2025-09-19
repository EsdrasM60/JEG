"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : Promise.reject(r));

export default function FinanzasPage() {
  const [filters, setFilters] = useState({ desde: "", hasta: "", categoria: "", subContratistaId: "" });
  const { data: summary } = useSWR('/api/finanzas/summary', fetcher);
  const { data: entries } = useSWR(() => `/api/finanzas?desde=${filters.desde}&hasta=${filters.hasta}&categoria=${encodeURIComponent(filters.categoria)}&subContratistaId=${filters.subContratistaId}`, fetcher, { revalidateOnFocus: false });

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold">Finanzas</h1>

      <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-sm text-muted">Total Ingresos</div>
          <div className="text-2xl font-bold">{summary ? summary.totalIngresos.toFixed(2) : "-"}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted">Total Gastos</div>
          <div className="text-2xl font-bold">{summary ? summary.totalGastos.toFixed(2) : "-"}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted">Balance</div>
          <div className="text-2xl font-bold">{summary ? (summary.totalIngresos - summary.totalGastos).toFixed(2) : "-"}</div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Ingresos / Gastos</h2>
        <div className="mt-3 flex gap-2 items-end">
          <div>
            <label className="block text-sm">Desde</label>
            <input type="date" value={filters.desde} onChange={(e)=>setFilters(f=>({ ...f, desde: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="block text-sm">Hasta</label>
            <input type="date" value={filters.hasta} onChange={(e)=>setFilters(f=>({ ...f, hasta: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="block text-sm">Categoría</label>
            <input value={filters.categoria} onChange={(e)=>setFilters(f=>({ ...f, categoria: e.target.value }))} className="input" placeholder="Ej: Materiales" />
          </div>
          <div>
            <label className="block text-sm">Sub Contratista</label>
            <input value={filters.subContratistaId} onChange={(e)=>setFilters(f=>({ ...f, subContratistaId: e.target.value }))} className="input" placeholder="ID" />
          </div>
          <div>
            <button onClick={()=>{ /* trigger revalidation by updating a state key */ setFilters(f=>({ ...f })); }} className="btn btn-primary">Filtrar</button>
          </div>
        </div>

        <div className="mt-4 overflow-auto">
          <table className="table-auto w-full">
            <thead>
              <tr>
                <th className="text-left p-2">Fecha</th>
                <th className="text-left p-2">Tipo</th>
                <th className="text-right p-2">Monto</th>
                <th className="text-left p-2">Categoría</th>
                <th className="text-left p-2">Proyecto</th>
                <th className="text-left p-2">Sub Contratista</th>
                <th className="text-left p-2">Nota</th>
              </tr>
            </thead>
            <tbody>
              {entries && entries.length === 0 && (
                <tr><td colSpan={7} className="p-4 text-center text-sm text-muted">No hay registros</td></tr>
              )}
              {entries && entries.map((r: any) => (
                <tr key={r._id} className="border-t">
                  <td className="p-2">{new Date(r.fecha).toLocaleDateString()}</td>
                  <td className="p-2">{r.tipo}</td>
                  <td className="p-2 text-right">{r.monto.toFixed(2)}</td>
                  <td className="p-2">{r.categoria}</td>
                  <td className="p-2">{r.proyectoId}</td>
                  <td className="p-2">{r.subContratistaId}</td>
                  <td className="p-2">{r.nota}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
