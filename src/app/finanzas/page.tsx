"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import useSWR, { mutate } from "swr";

const categories = ["Materiales", "Mano de Obra", "Gastos Adm", "Gastos Indirectos", "Otros"];

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : Promise.reject(r));

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n).replace('US$', '').trim();
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
        <div className="text-sm text-muted">Ingresos: <strong>{ingresos.toFixed(2)}</strong></div>
        <div className="text-sm text-muted">Gastos: <strong>{gastos.toFixed(2)}</strong></div>
        <div className="text-sm">Balance: <strong>{(ingresos - gastos).toFixed(2)}</strong></div>
      </div>
    </div>
  );
}

export default function FinanzasPage() {
  const [filters, setFilters] = useState({ desde: "", hasta: "", categoria: "", subContratistaId: "", tipo: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fecha: "", tipo: "GASTO", monto: "", categoria: "", proyectoId: "", subContratistaId: "", nota: "" });
  const dateRef = useRef<HTMLInputElement | null>(null);

  const { data: summary } = useSWR('/api/finanzas/summary', fetcher);
  const { data: entries } = useSWR(() => `/api/finanzas?desde=${filters.desde}&hasta=${filters.hasta}&categoria=${encodeURIComponent(filters.categoria)}&subContratistaId=${filters.subContratistaId}&tipo=${encodeURIComponent(filters.tipo)}`, fetcher, { revalidateOnFocus: false });
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

  useEffect(() => {
    // initialize fecha default on modal open and focus date input
    if (modalOpen) {
      setForm(f => ({ ...f, fecha: f.fecha || new Date().toISOString().slice(0,10) }));
      setTimeout(() => { try { dateRef.current?.focus(); } catch {} }, 0);
    }
  }, [modalOpen]);

  async function submitNew(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true);
    try {
      const montoNumber = Number(String(form.monto).replace(/[^0-9.-]+/g, '')) || 0;
      const payload = {
        fecha: form.fecha || new Date().toISOString(),
        tipo: form.tipo,
        monto: montoNumber,
        categoria: form.categoria,
        proyectoId: form.proyectoId || undefined,
        subContratistaId: form.subContratistaId || undefined,
        nota: form.nota || undefined,
      };
      const res = await fetch('/api/finanzas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw res;
      setModalOpen(false);
      setForm({ fecha: '', tipo: 'GASTO', monto: '', categoria: '', proyectoId: '', subContratistaId: '', nota: '' });
      // revalidate lists and summary
      await mutate('/api/finanzas');
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
          <button className="btn" onClick={() => setShowFilters(s => !s)} aria-expanded={showFilters ? 'true' : 'false'}>{showFilters ? 'Ocultar filtros' : 'Filtros'}</button>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>Nuevo</button>
        </div>
      </div>

      {showFilters && (
        <section className="mt-4 border p-3 rounded bg-[color:var(--surface)]">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
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
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm">Sub Contratista</label>
              <select title="Sub Contratista" aria-label="Sub Contratista" value={filters.subContratistaId} onChange={(e)=>setFilters(f=>({ ...f, subContratistaId: e.target.value }))} className="input">
                <option value="">--Todos--</option>
                {(subcontractors || []).map((s: any) => (
                  <option key={s.id || s._id} value={s.id || s._id}>{s.nombre} {s.apellido} {s.empresa ? `(${s.empresa})` : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={()=>{ /* trigger revalidation by updating a state key */ setFilters(f=>({ ...f })); }} className="btn btn-primary">Filtrar</button>
            <button onClick={()=>{ setFilters({ desde: '', hasta: '', categoria: '', subContratistaId: '', tipo: '' }); }} className="btn">Limpiar filtros</button>
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Ingresos / Gastos</h2>

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
              {entries && entries.map((r: any) => {
                const montoNum = Number(r.monto) || 0;
                const proyectoName = proyectoMap.get(String(r.proyectoId)) || r.proyectoId || "-";
                return (
                  <tr key={r._id} className="border-t">
                    <td className="p-2">{new Date(r.fecha).toLocaleDateString()}</td>
                    <td className="p-2">{r.tipo}</td>
                    <td className="p-2 text-right pr-8">{formatNumber(montoNum)}</td>
                    <td className="p-2 pl-6">{r.categoria}</td>
                    <td className="p-2">{proyectoName}</td>
                    <td className="p-2">{r.subContratistaId}</td>
                    <td className="p-2">{r.nota}</td>
                  </tr>
                );
              })}
             </tbody>
           </table>
         </div>
       </section>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setModalOpen(false)} />
          <form onSubmit={submitNew} className="relative z-[2001] w-full max-w-2xl bg-white p-4 rounded shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Nuevo registro</h3>
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
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
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
                    <option key={s.id || s._id} value={s.id || s._id}>{s.nombre} {s.apellido} {s.empresa ? `(${s.empresa})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm">Nota</label>
                <textarea title="Nota" aria-label="Nota" value={form.nota} onChange={(e)=>setForm(f=>({ ...f, nota: e.target.value }))} className="input h-24" />
              </div>
            </div>
            <div className="mt-3 flex gap-2 justify-end">
              <button type="button" className="btn" onClick={()=>setModalOpen(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Crear'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
