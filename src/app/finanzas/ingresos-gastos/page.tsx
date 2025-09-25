"use client";
import React, { useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';
import BarChart from '../../../components/BarChart';
import PieSummary from '../../../components/PieSummary';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function IngresosGastosPage() {
  const year = new Date().getFullYear();
  const { data, error, mutate } = useSWR(`/api/finanzas?year=${year}`, fetcher);
  const [monthData, setMonthData] = useState<any[]>([]);

  const totals = useMemo(() => {
    if (!Array.isArray(data)) return { ingresos: 0, gastos: 0 };
    return data.reduce((acc: any, item: any) => {
      const v = Number(item.monto) || 0;
      if (String(item.tipo || '').toUpperCase() === 'INGRESO') acc.ingresos += v; else acc.gastos += v;
      return acc;
    }, { ingresos: 0, gastos: 0 });
  }, [data]);

  useEffect(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({ label: new Date(year, i, 1).toLocaleString('default', { month: 'short' }), ingresos: 0, gastos: 0 }));
    if (Array.isArray(data)) {
      for (const e of data) {
        const dt = new Date(e.fecha);
        if (isNaN(dt.getTime())) continue;
        if (dt.getFullYear() !== year) continue;
        const idx = dt.getMonth();
        if (String(e.tipo || '').toUpperCase() === 'INGRESO') months[idx].ingresos += Number(e.monto) || 0; else months[idx].gastos += Number(e.monto) || 0;
      }
    }
    setMonthData(months.map(m => ({ label: `${m.label} ${year}`, ingresos: m.ingresos, gastos: m.gastos })));
  }, [data, year]);

  if (error) return <div className="p-6">Error cargando datos</div>;
  if (!data) return <div className="p-6">Cargando...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Ingresos / Gastos ({year})</h1>
        <div>
          <button className="btn btn-primary" onClick={() => window.location.href = '/finanzas/cxc'}>Nuevo (CxC)</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 p-4 border rounded bg-white shadow-sm">
          <h3 className="text-sm font-medium">Totales</h3>
          <div className="mt-3 text-2xl font-semibold">{Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(totals.ingresos - totals.gastos)}</div>
          <div className="mt-2 text-sm text-muted">Ingresos: {Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(totals.ingresos)}</div>
          <div className="text-sm text-muted">Gastos: {Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(totals.gastos)}</div>
        </div>

        <div className="lg:col-span-2 p-4 border rounded bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Ingresos / Gastos por mes</h3>
            <div className="text-xs text-muted">Año {year}</div>
          </div>
          <div className="w-full">
            <BarChart data={monthData} />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-medium mb-2">Listado de entradas</h3>
        <div className="border rounded overflow-hidden bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="p-2 text-left">Fecha</th>
                <th className="p-2 text-left">Tipo</th>
                <th className="p-2 text-left">Cliente/Proveedor</th>
                <th className="p-2 text-right">Monto</th>
                <th className="p-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d: any) => (
                <tr key={d._id} className="hover:bg-neutral-50">
                  <td className="p-2">{new Date(d.fecha).toLocaleDateString()}</td>
                  <td className="p-2">{d.tipo}</td>
                  <td className="p-2">{d.metadata?.cliente || d.metadata?.proveedor || ''}</td>
                  <td className="p-2 text-right">{Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(Number(d.monto) || 0)}</td>
                  <td className="p-2">{d.metadata?.estado || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
