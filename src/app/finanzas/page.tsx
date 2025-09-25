"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import useSWR, { mutate } from "swr";
import Link from 'next/link';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

const gastoCategories = ["Materiales", "Mano de Obra", "Gastos Adm", "Indirectos", "Otros"];
const ingresoCategories = ["Pago Inicial", "Abono", "Saldo"];
const allCategories = Array.from(new Set([...gastoCategories, ...ingresoCategories]));

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : Promise.reject(r));

function formatCurrency(n: number) {
  // format as 1,000,000.00 (commas thousands, dot decimal)
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function formatNumber(n: number) {
  // thousands separator: comma, decimal: dot
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

// New: stacked bar chart showing ingresos (amber) and gastos (orange) per month with axes, gridlines and hover tooltip
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
              {/* gridlines via background stripes */}
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
                  // SVG works in viewBox units; we'll use 100 height
                  const gastosH_v = gastosH;
                  const ingresosH_v = ingresosH;
                  const gastosY = 100 - gastosH_v;
                  const ingresosY = 100 - gastosH_v - ingresosH_v;

                  return (
                    <div key={d.label} className="flex-1 flex flex-col items-center min-w-[40px] relative">
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-40 bg-neutral-100 rounded border overflow-hidden">
                        <rect x="0" y={String(gastosY)} width="100" height={String(gastosH_v)} fill="#dc2626" onMouseEnter={() => setTooltip({ index: idx, label: d.label, type: 'gastos', value: d.gastos })} onMouseLeave={() => setTooltip(null)} />
                        <rect x="0" y={String(ingresosY)} width="100" height={String(ingresosH_v)} fill="#16a34a" onMouseEnter={() => setTooltip({ index: idx, label: d.label, type: 'ingresos', value: d.ingresos })} onMouseLeave={() => setTooltip(null)} />
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
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#16a34a] inline-block" /> Ingresos</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#dc2626] inline-block" /> Gastos</div>
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

export default function FinanzasPage() {
  const [filters, setFilters] = useState({ desde: "", hasta: "", categoria: "", subContratistaId: "", tipo: "", proyectoId: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fecha: "", tipo: "GASTO", monto: "", categoria: "", proyectoId: "", subContratistaId: "", nota: "" });
  const dateRef = useRef<HTMLInputElement | null>(null);

  const { data: summary } = useSWR('/api/finanzas/summary', fetcher);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const entriesKey = `/api/finanzas?desde=${filters.desde}&hasta=${filters.hasta}&categoria=${encodeURIComponent(filters.categoria)}&subContratistaId=${filters.subContratistaId}&tipo=${encodeURIComponent(filters.tipo)}&proyectoId=${encodeURIComponent(filters.proyectoId)}&page=${page}&pageSize=${pageSize}`;
  const { data: entriesResp } = useSWR(entriesKey, fetcher, { revalidateOnFocus: false });
  const entries = entriesResp?.items || [];
  const total = entriesResp?.total || 0;
  const { data: voluntarios } = useSWR('/api/voluntarios', fetcher);
  const { data: proyectosResp } = useSWR('/api/proyectos?page=1&pageSize=100', fetcher);
  // select employees whose cargo indicates they are subcontractors (covers 'Contratista', 'subcontratista', etc.)
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

  // map subcontractor id -> display name (nombre apellido (empresa))
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

  // compute totals from currently loaded entries (respecting filters)
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

  // compute category totals for current entries, grouped by tipo and categoria
  const categoryTotals = useMemo(() => {
    const byCat = new Map<string, number>();
    if (!Array.isArray(entries)) return byCat;
    for (const e of entries) {
      const tipo = String(e.tipo || '').toUpperCase();
      // only consider entries matching current tipo filter when a tipo is selected
      if (filters.tipo && filters.tipo !== '' && filters.tipo !== tipo) continue;
      const cat = e.categoria || (tipo === 'GASTO' ? 'Sin categoría' : 'Otros');
      const cur = Number(e.monto) || 0;
      byCat.set(cat, (byCat.get(cat) || 0) + cur);
    }
    return byCat;
  }, [entries, filters.tipo]);

  // Nuevo: resumen anual (sin filtros)
  const { data: resumenAnual } = useSWR('/api/finanzas/summary?desde=' + new Date(new Date().getFullYear(),0,1).toISOString().slice(0,10) + '&hasta=' + new Date(new Date().getFullYear(),11,31).toISOString().slice(0,10), fetcher);
  const ingresosAnio = resumenAnual?.totalIngresos || 0;
  const gastosAnio = resumenAnual?.totalGastos || 0;
  const balanceAnio = ingresosAnio - gastosAnio;

  // Obtener todas las entradas del año en curso (no afectadas por los filtros) para el gráfico mensual
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0,10);
  const yearEnd = new Date(new Date().getFullYear(), 11, 31).toISOString().slice(0,10);
  const { data: yearEntriesResp } = useSWR(`/api/finanzas?desde=${yearStart}&hasta=${yearEnd}&page=1&pageSize=1000`, fetcher);
  const yearEntries = yearEntriesResp?.items || [];

  // Fetch CxC / CxP aggregates for the current year (used in CxC/CxP sections)
  const { data: cxcResp } = useSWR(`/api/finanzas/cxc?desde=${yearStart}&hasta=${yearEnd}&page=1&pageSize=1000`, fetcher);
  const cxcEntries = Array.isArray(cxcResp?.items) ? cxcResp.items : [];
  const cxcByProject = Array.isArray(cxcResp?.byProject) ? cxcResp.byProject : [];
  const cxcBySub = Array.isArray(cxcResp?.bySub) ? cxcResp.bySub : [];

  const { data: cxpResp } = useSWR(`/api/finanzas/cxp?desde=${yearStart}&hasta=${yearEnd}&page=1&pageSize=1000`, fetcher);
  const cxpEntries = Array.isArray(cxpResp?.items) ? cxpResp.items : [];
  const cxpByProject = Array.isArray(cxpResp?.byProject) ? cxpResp.byProject : [];
  const cxpBySub = Array.isArray(cxpResp?.bySub) ? cxpResp.bySub : [];

  // Combined totals fallback (used when user is not admin)
  const { data: cuentasResp } = useSWR(`/api/finanzas/cuentas?desde=${yearStart}&hasta=${yearEnd}`, fetcher);
  const cuentasIngresos = cuentasResp?.totalIngresos;
  const cuentasGastos = cuentasResp?.totalGastos;

  // derive monthly ingresos and gastos for the bar chart (current year Jan..Dec)
  const monthlyData = useMemo(() => {
    const year = new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1).toLocaleString('default', { month: 'short', year: 'numeric' }));
    const map = new Map<string, { ingresos: number; gastos: number }>();
    months.forEach(m => map.set(m, { ingresos: 0, gastos: 0 }));
    if (Array.isArray(yearEntries)) {
      for (const e of yearEntries) {
        const dt = new Date(e.fecha);
        if (isNaN(dt.getTime())) continue;
        if (dt.getFullYear() !== year) continue;
        const key = dt.toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!map.has(key)) continue;
        const v = Number(e.monto) || 0;
        const tipo = String(e.tipo || '').toUpperCase();
        const cur = map.get(key) || { ingresos: 0, gastos: 0 };
        if (tipo === 'INGRESO') cur.ingresos += v;
        else cur.gastos += v;
        map.set(key, cur);
      }
    }
    return months.map(m => ({ label: m, ingresos: map.get(m)?.ingresos || 0, gastos: map.get(m)?.gastos || 0 }));
  }, [yearEntries]);

  async function submitNew(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true);
    try {
      const montoNumber = Number(String(form.monto).replace(/[^0-9.-]+/g, '')) || 0;
      // Normalize fecha: use the selected date (YYYY-MM-DD) and set time to midday UTC
      // to avoid timezone shifts that make the stored UTC date fall on the previous day.
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
      };
      let res;
      if (editingEntryId) {
        // update existing entry
        res = await fetch(`/api/finanzas/${editingEntryId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        // create new
        res = await fetch('/api/finanzas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      if (!res.ok) throw res;
      setModalOpen(false);
      setEditingEntryId(null);
      setForm({ fecha: '', tipo: 'GASTO', monto: '', categoria: '', proyectoId: '', subContratistaId: '', nota: '' });
      // revalidate lists (with current filters) and summary
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
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Finanzas</h1>
        <div className="flex items-center gap-2">
          <button className="btn" onClick={() => setShowFilters(s => !s)}>{showFilters ? 'Ocultar filtros' : 'Filtros'}</button>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>Nuevo</button>
        </div>
      </div>

      {/* Filters placed at top when toggled */}
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
              <select title="Tipo filtro" aria-label="Tipo filtro" value={filters.tipo} onChange={(e)=>setFilters(f=>({ ...f, tipo: e.target.value, categoria: '' }))} className="input">
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
                try {
                  const clearedKey = `/api/finanzas?desde=&hasta=&categoria=&subContratistaId=&tipo=&proyectoId=`;
                  mutate(clearedKey);
                  mutate('/api/finanzas/summary');
                } catch (e) { /* ignore */ }
              }}
              className="btn"
            >
              Limpiar filtros
            </button>
          </div>
        </section>
      )}

      {/* Sub-navigation like projects module */}
      <nav className="mt-4">
        <ul className="flex items-center gap-6 border-b pb-2">
          <li>
            <Link href="/finanzas" className="inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-neutral-900">
              <span className="rounded-full bg-neutral-100 w-8 h-8 flex items-center justify-center">📊</span>
              <span>Resumen</span>
            </Link>
          </li>
          <li>
            <Link href="/finanzas/cxc" className="inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-neutral-900">
              <span className="rounded-full bg-neutral-100 w-8 h-8 flex items-center justify-center">🧾</span>
              <span>CxC</span>
            </Link>
          </li>
          <li>
            <Link href="/finanzas/cxp" className="inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-neutral-900">
              <span className="rounded-full bg-neutral-100 w-8 h-8 flex items-center justify-center">💸</span>
              <span>CxP</span>
            </Link>
          </li>
          <li>
            <a href="#ingresos-gastos" className="inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-neutral-900">
              <span className="rounded-full bg-neutral-100 w-8 h-8 flex items-center justify-center">📈</span>
              <span>Ingresos / Gastos</span>
            </a>
          </li>
        </ul>
      </nav>

      {/* Resumen anual (restored) */}
      <section className="mt-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-center">Resumen anual ({new Date().getFullYear()})</h2>
        <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <PieChart slices={[
              { label: 'Ingresos', value: ingresosAnio, color: '#16a34a' },
              { label: 'Gastos', value: gastosAnio, color: '#dc2626' },
              { label: 'Balance', value: Math.max(0, balanceAnio), color: '#0ea5e9' },
            ]} size={140} />
            <div className="text-sm text-muted text-center">Ingresos: <b>{formatNumber(ingresosAnio)}</b> &nbsp;|&nbsp; Gastos: <b>{formatNumber(gastosAnio)}</b> &nbsp;|&nbsp; Balance: <b>{formatNumber(balanceAnio)}</b></div>
          </div>

          {/* Resumen CxC / CxP compact cards centered */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 border rounded bg-white shadow-sm w-72">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Cuenta por Cobrar (CxC)</div>
                <div className="text-sm text-muted">Total</div>
              </div>
              <div className="mt-3 text-2xl font-semibold">{formatNumber(Number(cuentasIngresos ?? cxcEntries.reduce((s: number, x: any) => s + (Number(x.monto) || 0), 0)))}</div>
              <div className="mt-3 text-xs text-muted">
                {cxcByProject.slice(0,3).map((p:any)=> (
                  <div key={String(p.key)} className="flex justify-between">
                    <div>{proyectoMap.get(String(p.key)) || String(p.key)}</div>
                    <div>{formatNumber(p.total)}</div>
                  </div>
                ))}
                {cxcByProject.length === 0 && <div>No hay items</div>}
              </div>
            </div>

            <div className="p-4 border rounded bg-white shadow-sm w-72">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Cuenta por Pagar (CxP)</div>
                <div className="text-sm text-muted">Total</div>
              </div>
              <div className="mt-3 text-2xl font-semibold">{formatNumber(Number(cuentasGastos ?? cxpEntries.reduce((s: number, x: any) => s + (Number(x.monto) || 0), 0)))}</div>
              <div className="mt-3 text-xs text-muted">
                {cxpByProject.slice(0,3).map((p:any)=> (
                  <div key={String(p.key)} className="flex justify-between">
                    <div>{proyectoMap.get(String(p.key)) || String(p.key)}</div>
                    <div>{formatNumber(p.total)}</div>
                  </div>
                ))}
                {cxpByProject.length === 0 && <div>No hay items</div>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ingresos / Gastos section (restored) */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ingresos / Gastos</h2>
        </div>

        {/* Totals and chart */}
        <div className="mt-4 mb-4">
          <div className="text-sm text-muted mb-2">Ingresos / Gastos (Año {new Date().getFullYear()})</div>
          <div className="flex flex-col lg:flex-row items-center justify-center gap-6">
            <div className="flex items-center gap-4 flex-1 justify-center">
              <PieSummary ingresos={totals.ingresos} gastos={totals.gastos} />
            </div>
            <div className="flex-1 max-w-4xl w-full">
              <BarChart data={monthlyData} />
            </div>
          </div>
        </div>

        {/* Listado de entradas (campos iguales al modal "Nuevo") */}
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">Listado de entradas</h3>
          <div className="border rounded overflow-hidden bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-white">
                <tr>
                  <th className="p-3 text-left">Fecha</th>
                  <th className="p-3 text-left">Tipo</th>
                  <th className="p-3 text-right">Monto</th>
                  <th className="p-3 text-left">Categoría</th>
                  <th className="p-3 text-left">Proyecto</th>
                  <th className="p-3 text-left">Sub Contratista</th>
                  <th className="p-3 text-left">Nota</th>
                  <th className="p-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((d: any) => (
                  <tr key={d._id} className="hover:bg-neutral-50">
                    <td className="p-3 border-b border-neutral-200">{d.fecha ? new Date(d.fecha).toLocaleDateString() : '-'}</td>
                    <td className="p-3 border-b border-neutral-200">{d.tipo || '-'}</td>
                    <td className="p-3 border-b border-neutral-200 text-right">{Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(Number(d.monto) || 0)}</td>
                    <td className="p-3 border-b border-neutral-200">{d.categoria || d.metadata?.categoria || '-'}</td>
                    <td className="p-3 border-b border-neutral-200">{proyectoMap.get(String(d.proyectoId)) || d.proyectoId || '-'}</td>
                    <td className="p-3 border-b border-neutral-200">{subcontractorMap.get(String(d.subContratistaId)) || d.subContratistaId || (d.metadata?.subContratista || '-')}</td>
                    <td className="p-3 border-b border-neutral-200">{d.nota || d.metadata?.nota || d.metadata?.descripcion || '-'}</td>
                    <td className="p-3 border-b border-neutral-200">
                      <div className="flex items-center gap-2">
                        <button type="button" title="Editar" className="p-1 border rounded inline-flex items-center justify-center hover:bg-neutral-100" onClick={(e)=>{ e.stopPropagation(); setEditingEntryId(String(d._id)); setForm({ fecha: new Date(d.fecha).toISOString().slice(0,10), tipo: d.tipo || 'GASTO', monto: Intl.NumberFormat('en-US',{ minimumFractionDigits:2 }).format(Number(d.monto)||0), categoria: d.categoria||d.metadata?.categoria||'', proyectoId: d.proyectoId||'', subContratistaId: d.subContratistaId||'', nota: d.nota||d.metadata?.nota||'' }); setModalOpen(true); }} aria-label="Editar">
                          <PencilSquareIcon className="h-5 w-5 text-neutral-700" />
                        </button>
                        <button type="button" title="Eliminar" className="p-1 border rounded inline-flex items-center justify-center hover:bg-red-50 text-red-600" onClick={(e)=>{ e.stopPropagation(); handleDelete(d._id); }} aria-label="Eliminar">
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* delete handler function (placed near listing) */}

      {/* Pagination for listado de entradas */}
        <div className="flex items-center justify-between gap-2 mt-3">
          <div className="flex items-center gap-2">
            <button className="btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Anterior</button>
            <button className="btn" onClick={() => setPage(p => Math.min(Math.max(1, Math.ceil((total || 0) / pageSize)), p + 1))} disabled={page >= Math.max(1, Math.ceil((total || 0) / pageSize))}>Siguiente</button>
            <span className="text-sm text-muted">Página {page} de {Math.max(1, Math.ceil((total || 0) / pageSize))} — {total || 0} registros</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">Tamaño</label>
            <select title="Tamaño de página" aria-label="Tamaño de página" className="input" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </section>

      {/* Modal */}
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
                <select title="Tipo" aria-label="Tipo" value={form.tipo} onChange={(e)=>{ const t = (e.target.value||'').toString(); setForm(f=>({ ...f, tipo: t, categoria: '' })); }} className="input">
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
              <div className="sm:col-span-2">
                <label className="block text-sm">Nota</label>
                <textarea title="Nota" aria-label="Nota" value={form.nota} onChange={(e)=>setForm(f=>({ ...f, nota: e.target.value }))} className="input h-24" />
              </div>
            </div>
            <div className="mt-3 flex gap-2 justify-end">
              <button type="button" className="btn" onClick={()=>{ setModalOpen(false); setEditingEntryId(null); }}>Cancelar</button>
              {editingEntryId && (
                <button type="button" title="Eliminar" className="p-2 border rounded inline-flex items-center justify-center hover:bg-red-50 text-red-600" onClick={async ()=>{ if (!confirm('¿Eliminar registro?')) return; await handleDelete(editingEntryId); }} disabled={saving} aria-label="Eliminar">
                  <TrashIcon className="h-5 w-5" />
                </button>
              )}
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? (editingEntryId ? 'Guardando...' : 'Guardando...') : (editingEntryId ? 'Actualizar' : 'Crear')}</button>
            </div>
           </form>
         </div>
     )}
    </div>
  );
}

async function handleDelete(id?: string | null) {
  if (!id) return;
  try {
    const res = await fetch(`/api/finanzas/${id}`, { method: 'DELETE' });
    if (!res.ok) throw res;
    try { mutate(`/api/finanzas?desde=&hasta=&categoria=&subContratistaId=&tipo=&proyectoId=`); mutate('/api/finanzas/summary'); } catch (e) {}
  } catch (err) {
    console.error('delete entry error', err);
    alert('Error eliminando el registro');
  }
}
