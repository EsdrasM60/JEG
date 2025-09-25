"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { TrashIcon } from '@heroicons/react/solid';

const gastoCategories = ["Materiales", "Mano de Obra", "Gastos Adm", "Indirectos", "Otros"];
const ingresoCategories = ["Pago Inicial", "Abono", "Saldo"];
const allCategories = Array.from(new Set([...gastoCategories, ...ingresoCategories]));

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : Promise.reject(r));

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function PieSummary({ ingresos = 0, gastos = 0 }: { ingresos?: number; gastos?: number }) {
  const total = ingresos + gastos;
  const ingresosPct = total === 0 ? 0 : (ingresos / total) * 100;
  const gastosPct = total === 0 ? 0 : (gastos / total) * 100;
  const size = 80;
  const stroke = 40;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const ingresosDash = (ingresosPct / 100) * circ;

  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`translate(${size/2},${size/2})`}>
          <circle r={radius} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
          <circle
            r={radius}
            fill="none"
            stroke="#16a34a"
            strokeWidth={stroke}
            strokeDasharray={`${ingresosDash} ${Math.max(0, circ - ingresosDash)}`}
            transform={`rotate(-90)`}
            strokeLinecap="round"
          />
          <circle
            r={radius}
            fill="none"
            stroke="#dc2626"
            strokeWidth={stroke}
            strokeDasharray={`${Math.max(0, circ - ingresosDash)} ${ingresosDash}`}
            transform={`rotate(${ -90 + (ingresosPct/100)*360 })`}
            strokeLinecap="round"
          />
        </g>
      </svg>
      <div>
        <div className="text-sm text-muted">Ingresos: <strong>{formatNumber(ingresos)}</strong></div>
        <div className="text-sm text-muted">Gastos: <strong>{formatNumber(gastos)}</strong></div>
        <div className="text-sm">Balance: <strong>{formatNumber(ingresos - gastos)}</strong></div>
      </div>
    </div>
  );
}

function BarChart({ data }: { data: Array<{ label: string; ingresos: number; gastos: number }> }) {
  const maxTotal = Math.max(1, ...data.map(d => Math.abs(d.ingresos) + Math.abs(d.gastos)));
  const allZero = data.every(d => (!d.ingresos && !d.gastos));
  const [tooltip, setTooltip] = useState<{ index: number; label: string; type: 'ingresos' | 'gastos'; value: number } | null>(null);
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((maxTotal * i) / tickCount));

  return (
    <div className="w-full relative">
      {allZero ? (
        <div className="w-full h-40 flex items-center justify-center text-sm text-muted">No hay datos para mostrar</div>
      ) : (
        <div className="flex gap-4">
          <div className="flex flex-col items-end pr-3 text-xs text-muted w-16">
            {ticks.slice().reverse().map((t, i) => (
              <div key={i} className="h-8 flex items-center">{formatNumber(t)}</div>
            ))}
          </div>

          <div className="flex-1">
            <div className="relative">
              <div className="flex items-end gap-3 h-56">
                {data.map((d, idx) => {
                  const rawIngresos = Math.abs(d.ingresos);
                  const rawGastos = Math.abs(d.gastos);
                  let ingresosH = Math.round((rawIngresos / maxTotal) * 100);
                  let gastosH = Math.round((rawGastos / maxTotal) * 100);
                  if (rawIngresos > 0 && ingresosH < 3) ingresosH = 3;
                  if (rawGastos > 0 && gastosH < 3) gastosH = 3;
                  const totalH = ingresosH + gastosH;
                  if (totalH > 100) {
                    const scale = 100 / totalH;
                    ingresosH = Math.max(1, Math.round(ingresosH * scale));
                    gastosH = Math.max(1, Math.round(gastosH * scale));
                  }
                  const gastosH_v = gastosH;
                  const ingresosH_v = ingresosH;
                  const gastosY = 100 - gastosH_v;
                  const ingresosY = 100 - gastosH_v - ingresosH_v;

                  return (
                    <div key={d.label} className="flex-1 flex flex-col items-center min-w-[40px] relative">
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-40 bg-neutral-100 rounded border overflow-hidden">
                        <rect x="0" y={String(gastosY)} width="100" height={String(gastosH_v)} fill="#f59e0b" onMouseEnter={() => setTooltip({ index: idx, label: d.label, type: 'gastos', value: d.gastos })} onMouseLeave={() => setTooltip(null)} />
                        <rect x="0" y={String(ingresosY)} width="100" height={String(ingresosH_v)} fill="#f97316" onMouseEnter={() => setTooltip({ index: idx, label: d.label, type: 'ingresos', value: d.ingresos })} onMouseLeave={() => setTooltip(null)} />
                      </svg>

                      {tooltip && tooltip.index === idx && (
                        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-50 bg-white shadow rounded px-3 py-1 text-sm">
                          <div className="font-medium">{tooltip.label}</div>
                          <div>{tooltip.type === 'ingresos' ? 'Ingresos' : 'Gastos'}: {formatNumber(tooltip.value)}</div>
                        </div>
                      )}

                      <div className="text-xs mt-2 text-center truncate w-full">{d.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-2 text-xs flex justify-between">
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#f97316] inline-block" /> Ingresos</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#f59e0b] inline-block" /> Gastos</div>
      </div>
    </div>
  );
}

function PieChart({ slices, size = 120 }: { slices: Array<{ label: string; value: number; color?: string }>; size?: number }) {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  const radius = size / 2 - 8;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`translate(${size/2},${size/2})`}>
        {slices.map((s, i) => {
          const portion = Math.max(0, s.value) / total;
          const dash = portion * circ;
          const stroke = s.color || `hsl(${(i * 57) % 360} 70% 50%)`;
          const elem = (
            <circle
              key={s.label}
              r={radius}
              fill="none"
              stroke={stroke}
              strokeWidth={radius}
              strokeDasharray={`${dash} ${Math.max(0, circ - dash)}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90)`}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return elem;
        })}
      </g>
    </svg>
  );
}

export const dynamic = 'force-dynamic';

export default function FinanzasClient() {
  const [filters, setFilters] = useState({ desde: "", hasta: "", categoria: "", subContratistaId: "", tipo: "", proyectoId: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fecha: "", tipo: "GASTO", monto: "", categoria: "", proyectoId: "", subContratistaId: "", nota: "", clienteId: "", cliente: "", proveedorId: "", proveedor: "" });
  const dateRef = useRef<HTMLInputElement | null>(null);

  const { data: summary } = useSWR('/api/finanzas/summary', fetcher);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const entriesKey = `/api/finanzas?desde=${filters.desde}&hasta=${filters.hasta}&categoria=${encodeURIComponent(filters.categoria)}&subContratistaId=${filters.subContratistaId}&tipo=${encodeURIComponent(filters.tipo)}&proyectoId=${encodeURIComponent(filters.proyectoId)}&page=${page}&pageSize=${pageSize}`;
  const { data: entriesResp } = useSWR(entriesKey, fetcher, { revalidateOnFocus: false });
  const entries = entriesResp?.items || [];
  const total = entriesResp?.total || 0;
  const { data: voluntarios } = useSWR('/api/voluntarios', fetcher);
  const { data: clientesResp } = useSWR('/api/clientes', fetcher);
  const clientesList = Array.isArray(clientesResp) ? clientesResp : [];
  const { data: proveedoresResp } = useSWR('/api/proveedores', fetcher);
  const proveedoresList = Array.isArray(proveedoresResp) ? proveedoresResp : [];
  const { data: proyectosResp } = useSWR('/api/proyectos?page=1&pageSize=100', fetcher);
  const subcontractors = Array.isArray(voluntarios)
    ? voluntarios.filter((v: any) => {
        const c = String(v.cargo || '').toLowerCase();
        return c.includes('sub') || c.includes('contrat') || c.includes('subcontrat');
      })
    : [];
  const proyectosList = Array.isArray(proyectosResp) ? proyectosResp : (proyectosResp?.items || []);

  const proyectoMap = useMemo(() => {
    const m = new Map<string, string>();
    proyectosList.forEach((p: any) => {
      const id = p._id || p.id;
      if (id) m.set(String(id), p.titulo || p.name || String(id));
    });
    return m;
  }, [proyectosList]);

  const subcontractorMap = useMemo(() => {
    const m = new Map<string, string>();
    (subcontractors || []).forEach((s: any) => {
      const id = s._id || s.id;
      if (!id) return;
      const name = `${s.nombre || ''} ${s.apellido || ''}`.trim();
      const display = name || (s.empresa ? s.empresa : String(id));
      m.set(String(id), s.empresa ? `${display} (${s.empresa})` : display);
    });
    return m;
  }, [subcontractors]);

  const totals = useMemo(() => {
    let ingresos = 0;
    let gastos = 0;
    if (Array.isArray(entries)) {
      for (const e of entries) {
        const m = Number(e.monto) || 0;
        if (String(e.tipo || '').toUpperCase() === 'INGRESO') ingresos += m;
        else gastos += m;
      }
    }
    return { ingresos, gastos };
  }, [entries]);

  const categoryTotals = useMemo(() => {
    const byCat = new Map<string, number>();
    if (!Array.isArray(entries)) return byCat;
    for (const e of entries) {
      const tipo = String(e.tipo || '').toUpperCase();
      if (filters.tipo && filters.tipo !== '' && filters.tipo !== tipo) continue;
      const cat = e.categoria || (tipo === 'GASTO' ? 'Sin categoría' : 'Otros');
      const cur = Number(e.monto) || 0;
      byCat.set(cat, (byCat.get(cat) || 0) + cur);
    }
    return byCat;
  }, [entries, filters.tipo]);

  useEffect(() => {
    if (modalOpen) {
      setForm(f => ({ ...f, fecha: f.fecha || new Date().toISOString().slice(0,10) }));
      setTimeout(() => { try { dateRef.current?.focus(); } catch {} }, 0);
    }
  }, [modalOpen]);

  useEffect(() => { setPage(1); }, [filters.desde, filters.hasta, filters.categoria, filters.subContratistaId, filters.tipo, filters.proyectoId, pageSize]);

  React.useEffect(() => {
    try { mutate(entriesKey); mutate('/api/finanzas/summary'); } catch (e) {}
  }, [filters.desde, filters.hasta, filters.categoria, filters.subContratistaId, filters.tipo, filters.proyectoId]);

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push(d.toLocaleString('default', { month: 'short', year: 'numeric' })); }
    const map = new Map<string, { ingresos: number; gastos: number }>();
    months.forEach(m => map.set(m, { ingresos: 0, gastos: 0 }));
    if (Array.isArray(entries)) {
      for (const e of entries) {
        const dt = new Date(e.fecha);
        if (isNaN(dt.getTime())) continue;
        const key = dt.toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!map.has(key)) continue;
        const v = Number(e.monto) || 0;
        const tipo = String(e.tipo || '').toUpperCase();
        const cur = map.get(key) || { ingresos: 0, gastos: 0 };
        if (tipo === 'INGRESO') cur.ingresos += v; else cur.gastos += v;
        map.set(key, cur);
      }
    }
    return months.map(m => ({ label: m, ingresos: map.get(m)?.ingresos || 0, gastos: map.get(m)?.gastos || 0 }));
  }, [entries]);

  async function submitNew(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true);
    try {
      const montoNumber = Number(String(form.monto).replace(/[^0-9.-]+/g, '')) || 0;
      const fechaIso = form.fecha
        ? new Date(`${form.fecha}T12:00:00Z`).toISOString()
        : new Date().toISOString();

      const payload = {
        fecha: fechaIso,
        tipo: form.tipo,
        monto: montoNumber,
        categoria: form.categoria,
        proyectoId: form.proyectoId || undefined,
        subContratistaId: form.subContratistaId || undefined,
        nota: form.nota || undefined,
        metadata: { clienteId: form.clienteId || undefined, clienteLabel: form.cliente || undefined, proveedorId: form.proveedorId || undefined, proveedorLabel: form.proveedor || undefined }
      };
      let res;
      if (editingEntryId) {
        res = await fetch(`/api/finanzas/${editingEntryId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        res = await fetch('/api/finanzas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      if (!res.ok) throw res;
      setModalOpen(false);
      setEditingEntryId(null);
      setForm({ fecha: '', tipo: 'GASTO', monto: '', categoria: '', proyectoId: '', subContratistaId: '', nota: '', clienteId: '', cliente: '', proveedorId: '', proveedor: '' });
      await mutate(entriesKey);
      await mutate('/api/finanzas/summary');
    } catch (err) {
      console.error('create finance error', err);
      alert('Error creando registro');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Finanzas</h1>
        <div className="flex items-center gap-2">
          <button className="btn" onClick={() => setShowFilters(s => !s)} aria-expanded={showFilters}>{showFilters ? 'Ocultar filtros' : 'Filtros'}</button>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>Nuevo</button>
        </div>
      </div>

      {showFilters && (
        <section className="mt-4 border p-3 rounded bg-[color:var(--surface)]">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-sm">Proyecto</label>
              <select title="Proyecto" aria-label="Proyecto filtro" value={filters.proyectoId} onChange={(e)=>setFilters(f=>({ ...f, proyectoId: e.target.value }))} className="input">
                <option value="">--Todos--</option>
                {proyectosList.map((p: any) => (
                  <option key={p._id || p.id} value={p._id || p.id}>{p.titulo || p.name || `${p._id || p.id}`}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-5" />

            <div>
              <label className="block text-sm">Desde</label>
              <input title="Fecha desde" aria-label="Fecha desde" type="date" value={filters.desde} onChange={(e)=>setFilters(f=>({ ...f, desde: e.target.value }))} className="input" placeholder="Desde" />
            </div>
            <div>
              <label className="block text-sm">Hasta</label>
              <input title="Fecha hasta" aria-label="Fecha hasta" type="date" value={filters.hasta} onChange={(e)=>setFilters(f=>({ ...f, hasta: e.target.value }))} className="input" placeholder="Hasta" />
            </div>
            <div>
              <label className="block text-sm">Tipo</label>
              <select title="Tipo filtro" aria-label="Tipo filtro" value={filters.tipo} onChange={(e)=>setFilters(f=>({ ...f, tipo: e.target.value }))} className="input">
                <option value="">--Todos--</option>
                <option value="INGRESO">INGRESO</option>
                <option value="GASTO">GASTO</option>
              </select>
            </div>
            <div>
              <label className="block text-sm">Categoría</label>
              <select title="Categoría" aria-label="Categoría" value={filters.categoria} onChange={(e)=>setFilters(f=>({ ...f, categoria: e.target.value }))} className="input">
                <option value="">--Todas--</option>
                {(filters.tipo === 'GASTO' ? gastoCategories : filters.tipo === 'INGRESO' ? ingresoCategories : allCategories).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm">Sub Contratista</label>
              <select title="Sub Contratista" aria-label="Sub Contratista" value={filters.subContratistaId} onChange={(e)=>setFilters(f=>({ ...f, subContratistaId: e.target.value }))} className="input">
                <option value="">--Todos--</option>
                {(subcontractors || []).map((s: any) => (
                  <option key={s.id || s._id} value={s.id || s._id}>{`${(s.nombre || '').trim()} ${(s.apellido || '').trim()}`.trim() || (s.empresa || '')}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                setFilters({ desde: '', hasta: '', categoria: '', subContratistaId: '', tipo: '', proyectoId: '' });
                try { const clearedKey = `/api/finanzas?desde=&hasta=&categoria=&subContratistaId=&tipo=&proyectoId=`; mutate(clearedKey); mutate('/api/finanzas/summary'); } catch (e) { }
              }}
              className="btn"
            >
              Limpiar filtros
            </button>
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Ingresos / Gastos</h2>

        <div className="mt-4 mb-4">
          <div className="text-sm text-muted mb-2">Ingresos / Gastos por mes (últimos 12 meses)</div>
          <div className="flex flex-col lg:flex-row items-center justify-center gap-6">
            <div className="flex items-center gap-4 flex-1">
              <div>
                {filters.tipo === 'GASTO' || filters.tipo === 'INGRESO' ? (
                  (() => {
                    const slices = Array.from(categoryTotals.entries()).map(([label, value]) => ({ label, value }));
                    slices.sort((a, b) => b.value - a.value);
                    const top = slices.slice(0, 10);
                    const rest = slices.slice(10);
                    if (rest.length > 0) {
                      const restSum = rest.reduce((s, x) => s + x.value, 0);
                      top.push({ label: 'Otros', value: restSum });
                    }
                    return (
                      <div className="flex items-center gap-3">
                        <PieChart slices={top} size={120} />
                        <div>
                          <div className="text-sm text-muted">Distribución por categoría ({filters.tipo})</div>
                          <div className="mt-1 text-sm">
                            {top.map((s, i) => (
                              <div key={s.label} className="flex items-center gap-2 text-xs">
                                <span className="w-2 h-2 rounded inline-block bg-neutral-300" />
                                <strong>{s.label}</strong>: {formatNumber(s.value)}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <PieSummary ingresos={totals.ingresos} gastos={totals.gastos} />
                )}
              </div>
            </div>
            <div className="flex-1 max-w-3xl w-full">
              <BarChart data={monthlyData} />
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-auto">
          <table className="w-full text-base">
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
              {entries && entries.map((r: any) => {
                const montoNum = Number(r.monto) || 0;
                const proyectoName = proyectoMap.get(String(r.proyectoId)) || r.proyectoId || "-";
                return (
                  <tr key={r._id} className="border-t cursor-pointer hover:bg-[color:var(--surface-2)]" onClick={() => {
                    setEditingEntryId(String(r._id));
                    setForm({
                      fecha: new Date(r.fecha).toISOString().slice(0,10),
                      tipo: r.tipo || 'GASTO',
                      monto: formatCurrency(Number(r.monto) || 0),
                      categoria: r.categoria || '',
                      proyectoId: r.proyectoId || '',
                      subContratistaId: r.subContratistaId || '',
                      nota: r.nota || '',
                      clienteId: r.metadata?.clienteId || '',
                      cliente: r.metadata?.clienteLabel || '',
                      proveedorId: r.metadata?.proveedorId || '',
                      proveedor: r.metadata?.proveedorLabel || '',
                    });
                    setModalOpen(true);
                  }}>
                    <td className="p-2">{new Date(r.fecha).toLocaleDateString()}</td>
                    <td className="p-2">{r.tipo}</td>
                    <td className="p-2 text-right pr-8">{formatNumber(montoNum)}</td>
                    <td className="p-2 pl-6">{r.categoria}</td>
                    <td className="p-2">{proyectoName}</td>
                    <td className="p-2">{subcontractorMap.get(String(r.subContratistaId)) || r.subContratistaId || '-'}</td>
                    <td className="p-2">{r.nota}</td>
                  </tr>
               );
             })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Anterior</button>
            <button className="btn" onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= total}>Siguiente</button>
            <div className="text-sm text-muted">Página {page} de {Math.max(1, Math.ceil(total / pageSize))} — {total} registros</div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">Registros por página</label>
            <select title="Tamaño de página" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="input text-sm">
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setModalOpen(false)} />
          <form onSubmit={submitNew} className="relative z-[2001] w-full max-w-2xl bg-white p-4 rounded shadow-lg">
            <h3 className="text-lg font-semibold mb-2">{editingEntryId ? 'Editar registro' : 'Nuevo registro'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm">Fecha</label>
                <input ref={dateRef} title="Fecha" aria-label="Fecha" type="date" value={form.fecha} onChange={(e)=>setForm(f=>({ ...f, fecha: e.target.value }))} className="input" required />
              </div>
              <div>
                <label className="block text-sm">Tipo</label>
                <select title="Tipo" aria-label="Tipo" value={form.tipo} onChange={(e)=>setForm(f=>({ ...f, tipo: e.target.value }))} className="input">
                  <option value="GASTO">GASTO</option>
                  <option value="INGRESO">INGRESO</option>
                </select>
              </div>
              <div>
                <label className="block text-sm">Monto</label>
                <input
                  title="Monto"
                  aria-label="Monto"
                  inputMode="decimal"
                  value={form.monto}
                  onFocus={() => setForm(f => ({ ...f, monto: String(f.monto).replace(/[^0-9.-]+/g, '') }))}
                  onChange={(e)=>setForm(f=>({ ...f, monto: e.target.value }))}
                  onBlur={() => setForm(f => ({ ...f, monto: formatCurrency(Number(String(f.monto).replace(/[^0-9.-]+/g, '')) || 0) }))}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm">Categoría</label>
                <select title="Categoría" aria-label="Categoría" value={form.categoria} onChange={(e)=>setForm(f=>({ ...f, categoria: e.target.value }))} className="input">
                  <option value="">--Seleccionar--</option>
                  {(form.tipo === 'GASTO' ? gastoCategories : form.tipo === 'INGRESO' ? ingresoCategories : allCategories).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm">Proyecto ID</label>
                <select title="Proyecto" aria-label="Proyecto" value={form.proyectoId} onChange={(e)=>setForm(f=>({ ...f, proyectoId: e.target.value }))} className="input">
                  <option value="">--Sin proyecto--</option>
                  {proyectosList.map((p: any) => (
                    <option key={p._id || p.id} value={p._id || p.id}>{p.titulo || p.name || `${p._id || p.id}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm">Sub Contratista</label>
                <select title="Sub Contratista" aria-label="Sub Contratista" value={form.subContratistaId} onChange={(e)=>setForm(f=>({ ...f, subContratistaId: e.target.value }))} className="input">
                  <option value="">--Seleccionar--</option>
                  {subcontractors.map((s: any) => (
                    <option key={s.id || s._id} value={s.id || s._id}>{`${(s.nombre || '').trim()} ${(s.apellido || '').trim()}`.trim() || (s.empresa || '')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm">Cliente</label>
                <select title="Cliente" aria-label="Cliente" value={form.clienteId} onChange={(e)=>{ const label = e.target.selectedOptions?.[0]?.text || ''; setForm(f=>({ ...f, clienteId: e.target.value, cliente: label })); }} className="input">
                  <option value="">--Sin cliente--</option>
                  {clientesList.map((c:any) => (
                    <option key={c.id || c._id} value={c.id || c._id}>{(c.nombre || c.name || c.display) + (c.empresa ? ` (${c.empresa})` : '')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm">Proveedor</label>
                <select title="Proveedor" aria-label="Proveedor" value={form.proveedorId} onChange={(e)=>{ const label = e.target.selectedOptions?.[0]?.text || ''; setForm(f=>({ ...f, proveedorId: e.target.value, proveedor: label })); }} className="input">
                  <option value="">--Sin proveedor--</option>
                  {proveedoresList.map((p:any) => (
                    <option key={p.id || p._id} value={p.id || p._id}>{(p.nombre || p.name || p.display) + (p.empresa ? ` (${p.empresa})` : '')}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm">Nota</label>
                <textarea title="Nota" aria-label="Nota" value={form.nota} onChange={(e)=>setForm(f=>({ ...f, nota: e.target.value }))} className="input h-24" />
              </div>
            </div>
            <div className="mt-3 flex gap-2 justify-end">
              <button type="button" className="btn" onClick={()=>{ setModalOpen(false); setEditingEntryId(null); }}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? (editingEntryId ? 'Guardando...' : 'Guardando...') : (editingEntryId ? 'Actualizar' : 'Crear')}</button>
             </form>
           </div>
      )}

      {editingEntryId && (
                 <button type="button" title="Eliminar" className="p-2 border rounded inline-flex items-center justify-center hover:bg-red-50 text-red-600" onClick={async ()=>{ if (!confirm('¿Eliminar registro?')) return; await handleDelete(editingEntryId); }} disabled={saving} aria-label="Eliminar">
                   <TrashIcon className="h-5 w-5" />
                 </button>
               )}
   </div>
 }

 async function handleDelete(id?: string | null) {
    if (!id) return;
    try {
      await fetch(`/api/finanzas/${id}`, { method: 'DELETE' });
      mutate('/api/finanzas');
      mutate('/api/finanzas/summary');
    } catch (e) {
      console.error('Error eliminando registro', e);
      alert('Error eliminando registro');
    }
  }
