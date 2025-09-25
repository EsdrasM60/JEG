"use client";
import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : Promise.reject(r));

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function formatDate(d: string | Date | undefined) {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '-';
  return dt.toLocaleDateString('en-GB');
}

export default function CxPPage() {
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0,10);
  const yearEnd = new Date(new Date().getFullYear(), 11, 31).toISOString().slice(0,10);
  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(25);
  const { data: resp } = useSWR(`/api/finanzas/cxp?desde=${yearStart}&hasta=${yearEnd}&page=${page}&pageSize=${pageSize}`, fetcher);
  const { data: proyectosResp } = useSWR('/api/proyectos?page=1&pageSize=100', fetcher);
  const { data: proveedoresResp } = useSWR('/api/proveedores', fetcher);

  const items = Array.isArray(resp?.items) ? resp.items : [];
  const total = typeof resp?.total === 'number' ? resp.total : (resp?.totalSum ?? items.reduce((s:any,x:any) => s + (Number(x.monto)||0), 0));
  const totalPages = Math.max(1, Math.ceil((resp?.total || 0) / pageSize));

  const proyectosList = Array.isArray(proyectosResp) ? proyectosResp : (proyectosResp?.items || []);
  const proyectoMap = useMemo(() => {
    const m = new Map<string,string>();
    proyectosList.forEach((p: any) => {
      const id = p._id || p.id;
      if (id) m.set(String(id), p.titulo || p.name || String(id));
    });
    return m;
  }, [proyectosList]);

  const proveedoresList = Array.isArray(proveedoresResp) ? proveedoresResp : [];
  const proveedorOptions = useMemo(() => {
    const set = new Set<string>();
    proveedoresList.forEach((p:any) => {
      const nombre = p.nombre || p.name || '';
      const empresa = p.empresa || p.company || p.nombreEmpresa || '';
      let label = '';
      if (nombre && empresa) label = `${nombre} — ${empresa}`;
      else label = nombre || empresa || '';
      if (label) set.add(String(label));
    });
    (items || []).forEach((it:any)=>{ if (it.proveedor) set.add(String(it.proveedor)); });
    return Array.from(set).sort((a,b)=>a.localeCompare(b));
  }, [proveedoresList, items]);

  const [localInvoices, setLocalInvoices] = useState<any[]>(items || []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [form, setForm] = useState<any>({
    fecha: new Date().toISOString().slice(0,10),
    proveedorId: '',
    proveedor: '',
    proyectoId: '',
    factura: '',
    montoSinItbis: '',
    itbis: '',
    diasCredito: 0,
    estado: 'Pendiente',
  });

  // client-side sorting / filtering state
  const [sortKey, setSortKey] = useState<string>('fecha');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const [proveedorFilter, setProveedorFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [estadoFilter, setEstadoFilter] = useState<string>('');

  const clearFilters = () => { setProveedorFilter(''); setProjectFilter(''); setEstadoFilter(''); };

  React.useEffect(() => { setLocalInvoices(items || []); }, [items]);
  React.useEffect(() => { setEditingId(null); setShowDeleteConfirm(false); }, [page, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const displayInvoices = useMemo(() => {
    const list = (localInvoices || []).map((r:any) => ({ ...r, proyectoName: proyectoMap.get(String(r.proyectoId)) || '' }));

    const termProv = (proveedorFilter || '').trim().toLowerCase();
    const termProject = (projectFilter || '').trim().toLowerCase();
    const termEstado = (estadoFilter || '').trim().toLowerCase();

    const filtered = list.filter((inv:any) => {
      if (termProv && !String(inv.proveedor || '').toLowerCase().includes(termProv)) return false;
      if (termProject) {
        const proj = String(inv.proyectoName || inv.proyectoId || '').toLowerCase();
        if (!proj.includes(termProject)) return false;
      }
      if (termEstado && String(inv.estado || '').toLowerCase() !== termEstado) return false;
      return true;
    });

    const sorted = filtered.sort((a:any,b:any) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      let va:any = a[sortKey as keyof any];
      let vb:any = b[sortKey as keyof any];

      if (sortKey === 'fecha') {
        va = new Date(va).getTime() || 0;
        vb = new Date(vb).getTime() || 0;
      } else if (['montoSinItbis','itbis','totalAmount','balance'].includes(sortKey)) {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
      } else {
        va = String(va || '').toLowerCase();
        vb = String(vb || '').toLowerCase();
      }

      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    return sorted;
  }, [localInvoices, proyectoMap, sortKey, sortDir, proveedorFilter, projectFilter, estadoFilter]);

  const finalDisplayInvoices = displayInvoices.map((r:any) => ({ ...r }));

  const computeTotal = () => {
    const a = Number(String(form.montoSinItbis).replace(/[^0-9.-]+/g,'')) || 0;
    const b = Number(String(form.itbis).replace(/[^0-9.-]+/g,'')) || 0;
    return a + b;
  };

  const computeBalance = (total:number) => total;

  async function submitInvoice(e?: React.FormEvent) {
    e?.preventDefault();
    const montoSin = Number(String(form.montoSinItbis).replace(/[^0-9.-]+/g,'')) || 0;
    const itbis = Number(String(form.itbis).replace(/[^0-9.-]+/g,'')) || 0;
    const total = montoSin + itbis;
    const newInv = {
      id: `local-${Date.now()}`,
      fecha: new Date(form.fecha).toISOString(),
      proveedorId: form.proveedorId,
      proveedor: form.proveedor,
      proyectoId: form.proyectoId,
      factura: form.factura,
      montoSinItbis: montoSin,
      itbis,
      totalAmount: total,
      diasCredito: Number(form.diasCredito) || 0,
      estado: form.estado,
      balance: computeBalance(total),
    };

    if (!editingId) {
      // create
      setLocalInvoices(prev => [newInv, ...prev]);
      setModalOpen(false);
      try {
        await fetch('/api/finanzas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fecha: newInv.fecha,
            tipo: 'EGRESO',
            monto: newInv.totalAmount,
            categoria: 'CxP',
            proyectoId: newInv.proyectoId || undefined,
            nota: `Factura: ${newInv.factura} Proveedor: ${newInv.proveedor || ''} DiasCredito:${newInv.diasCredito}`,
            metadata: { proveedorId: newInv.proveedorId, proveedorLabel: newInv.proveedor, montoSinItbis: newInv.montoSinItbis, itbis: newInv.itbis, factura: newInv.factura, diasCredito: newInv.diasCredito, estado: newInv.estado },
          })
        });
      } catch (err) {
        console.error('persist cxP invoice error', err);
      }
    } else {
      // patch existing
      const id = editingId;
      setLocalInvoices(prev => prev.map(inv => (inv._id === id || inv.id === id) ? { ...inv, ...newInv, _id: id } : inv));
      setModalOpen(false);
      setEditingId(null);
      try {
        await fetch(`/api/finanzas/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fecha: newInv.fecha,
            monto: newInv.totalAmount,
            proyectoId: newInv.proyectoId || undefined,
            nota: `Factura: ${newInv.factura} Proveedor: ${newInv.proveedor || ''} DiasCredito:${newInv.diasCredito}`,
            metadata: { proveedorId: newInv.proveedorId, proveedorLabel: newInv.proveedor, montoSinItbis: newInv.montoSinItbis, itbis: newInv.itbis, factura: newInv.factura, diasCredito: newInv.diasCredito, estado: newInv.estado },
          })
        });
      } catch (err) {
        console.error('patch cxP invoice error', err);
      }
    }
  }

  function openEdit(inv: any) {
    setEditingId(inv._id || inv.id || null);
    setForm({
      fecha: inv.fecha ? new Date(inv.fecha).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
      proveedorId: inv.proveedorId || inv.metadata?.proveedorId || '',
      proveedor: inv.proveedor || inv.metadata?.proveedorLabel || '',
      proyectoId: inv.proyectoId || '',
      factura: inv.factura || inv.metadata?.factura || '',
      montoSinItbis: (inv.montoSinItbis ?? inv.metadata?.montoSinItbis ?? inv.monto) || '',
      itbis: (inv.itbis ?? inv.metadata?.itbis) || 0,
      diasCredito: (inv.diasCredito ?? inv.metadata?.diasCredito) || 0,
      estado: inv.estado ?? inv.metadata?.estado ?? 'Pendiente',
    });
    setModalOpen(true);
  }

  async function deleteInvoice(id: string) {
    if (!id) return;
    setLocalInvoices(prev => prev.filter(x => (x._id || x.id) !== id));
    try {
      await fetch(`/api/finanzas/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('delete cxP invoice error', err);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Cuenta por Pagar (CxP) - {new Date().getFullYear()}</h1>
        <div className="flex items-center gap-2">
          <button className="btn" onClick={() => setModalOpen(true)}>Nuevo CxP</button>
          <Link href="/finanzas" className="btn">Volver a Finanzas</Link>
        </div>
      </div>

      <div className="mb-3 text-sm text-muted">Total: <strong>{formatCurrency(Number(total) || 0)}</strong></div>

      {/* filter + sort controls */}
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            className="input w-full sm:w-64"
            value={proveedorFilter}
            onChange={(e)=>setProveedorFilter(e.target.value)}
            title="Filtrar por proveedor"
            aria-label="Filtrar por proveedor"
          >
            <option value="">Proveedor (todos)</option>
            {proveedorOptions.map((c:any)=> <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input" value={projectFilter} onChange={(e)=>setProjectFilter(e.target.value)} title="Filtrar por proyecto" aria-label="Filtrar por proyecto">
            <option value="">Proyecto (todos)</option>
            {proyectosList.map((p:any)=> <option key={p._id||p.id} value={(p.titulo||p.name||p._id||p.id).toString().toLowerCase()}>{p.titulo||p.name||p._id||p.id}</option>)}
          </select>
          <select className="input" value={estadoFilter} onChange={(e)=>setEstadoFilter(e.target.value)} title="Filtrar por estado" aria-label="Filtrar por estado">
            <option value="">Estado (todos)</option>
            <option value="pendiente">Pendiente</option>
            <option value="saldo">Saldo</option>
          </select>
          <button type="button" className="btn" onClick={clearFilters} title="Limpiar filtros">Limpiar</button>
        </div>
        <div className="text-sm text-muted">Orden: <strong className="ml-1">{sortKey} {sortDir === 'asc' ? '▲' : '▼'}</strong></div>
      </div>

      {/* Invoices table */}
      <div className="mb-4">
        <div className="overflow-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left">
              <tr>
                <th className="p-2"><button className="w-full text-left" onClick={()=>handleSort('fecha')} aria-label="Ordenar por Fecha">Fecha {sortKey === 'fecha' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button></th>
                <th className="p-2"><button className="w-full text-left" onClick={()=>handleSort('proveedor')} aria-label="Ordenar por Proveedor">Proveedor {sortKey === 'proveedor' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button></th>
                <th className="p-2"><button className="w-full text-left" onClick={()=>handleSort('proyectoName')} aria-label="Ordenar por Proyecto">Proyecto {sortKey === 'proyectoName' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button></th>
                <th className="p-2"><button className="w-full text-left" onClick={()=>handleSort('factura')} aria-label="Ordenar por Factura">Factura {sortKey === 'factura' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button></th>
                <th className="p-2 text-right"><button className="w-full text-right" onClick={()=>handleSort('montoSinItbis')} aria-label="Ordenar por Monto sin Itbis">Monto sin Itbis {sortKey === 'montoSinItbis' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button></th>
                <th className="p-2 text-right"><button className="w-full text-right" onClick={()=>handleSort('itbis')} aria-label="Ordenar por Itbis">Itbis {sortKey === 'itbis' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button></th>
                <th className="p-2 text-right"><button className="w-full text-right" onClick={()=>handleSort('totalAmount')} aria-label="Ordenar por Monto Total">Monto Total {sortKey === 'totalAmount' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button></th>
                <th className="p-2"><button className="w-full text-left" onClick={()=>handleSort('diasCredito')} aria-label="Ordenar por Días Crédito">Dias Crédito {sortKey === 'diasCredito' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button></th>
                <th className="p-2"><button className="w-full text-left" onClick={()=>handleSort('estado')} aria-label="Ordenar por Estado">Estado {sortKey === 'estado' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button></th>
                <th className="p-2 text-right"><button className="w-full text-right" onClick={()=>handleSort('balance')} aria-label="Ordenar por Balance">Balance {sortKey === 'balance' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button></th>
              </tr>
            </thead>
            <tbody>
              {finalDisplayInvoices.length === 0 && (
                <tr><td colSpan={10} className="p-4 text-center text-sm text-muted">No hay facturas registradas</td></tr>
              )}
              {finalDisplayInvoices.map((inv:any) => (
                <tr key={inv._id || inv.id} className="cursor-pointer" onClick={() => openEdit(inv)} role="button" tabIndex={0} onKeyDown={(e)=>{ if(e.key === 'Enter') openEdit(inv); }}>
                  <td className="p-4 border-b border-neutral-200">{formatDate(inv.fecha)}</td>
                  <td className="p-4 border-b border-neutral-200">{inv.proveedor || '-'}</td>
                  <td className="p-4 border-b border-neutral-200">{inv.proyectoName || inv.proyectoId || '-'}</td>
                  <td className="p-4 border-b border-neutral-200">{inv.factura || '-'}</td>
                  <td className="p-4 border-b border-neutral-200 text-right">{formatCurrency(Number(inv.montoSinItbis) || 0)}</td>
                  <td className="p-4 border-b border-neutral-200 text-right">{formatCurrency(Number(inv.itbis) || 0)}</td>
                  <td className="p-4 border-b border-neutral-200 text-right">{formatCurrency(Number(inv.totalAmount) || 0)}</td>
                  <td className="p-4 border-b border-neutral-200">{inv.diasCredito}</td>
                  <td className="p-4 border-b border-neutral-200">{inv.estado}</td>
                  <td className="p-4 border-b border-neutral-200 text-right">{formatCurrency(Number(inv.balance) || 0)}</td>
                </tr>
               ))}
              </tbody>
            </table>
          </div>
        </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between gap-2 mt-3">
        <div className="flex items-center gap-2">
          <button className="btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>Anterior</button>
          <button className="btn" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}>Siguiente</button>
          <span className="text-sm text-muted">Página {page} de {totalPages} — {resp?.total ?? 0} registros</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Tamaño</label>
          <select title="Tamaño de página" aria-label="Tamaño de página" className="input" value={pageSize} onChange={(e)=>{ setPageSize(Number(e.target.value)); setPage(1); }}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <form onSubmit={submitInvoice} className="relative z-50 bg-white p-4 rounded shadow w-[95vw] max-w-2xl">
            <h3 className="text-lg font-semibold mb-2">Nuevo registro CxP</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm">Fecha</label>
                <input title="Fecha" aria-label="Fecha" type="date" value={form.fecha} onChange={(e)=>setForm((f:any)=>({...f, fecha: e.target.value}))} className="input" required />
              </div>
              <div>
                <label className="block text-sm">Proveedor</label>
                <select
                  title="Proveedor"
                  aria-label="Proveedor"
                  value={form.proveedorId}
                  onChange={(e)=>{
                    const label = e.target.selectedOptions?.[0]?.text || '';
                    setForm((f:any)=>({...f, proveedorId: e.target.value, proveedor: label}));
                  }}
                  className="input"
                >
                  <option value="">--Seleccione--</option>
                  {proveedoresList.map((p:any) => {
                    const id = p._id || p.id;
                    const nombre = p.nombre || p.name || '';
                    const empresa = p.empresa || p.company || p.nombreEmpresa || '';
                    const label = nombre && empresa ? `${nombre} — ${empresa}` : (nombre || empresa || '');
                    return <option key={id || label} value={id}>{label}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm">Proyecto</label>
                <select title="Proyecto" aria-label="Proyecto" value={form.proyectoId} onChange={(e)=>setForm((f:any)=>({...f, proyectoId: e.target.value}))} className="input">
                  <option value="">--Seleccione--</option>
                  {proyectosList.map((p:any)=> <option key={p._id||p.id} value={p._id||p.id}>{p.titulo||p.name||p._id||p.id}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm">Factura</label>
                <input title="Factura" aria-label="Factura" placeholder="Número de factura" value={form.factura} onChange={(e)=>setForm((f:any)=>({...f, factura: e.target.value}))} className="input" />
              </div>
              <div>
                <label className="block text-sm">Monto sin Itbis</label>
                <input title="Monto sin Itbis" aria-label="Monto sin Itbis" placeholder="0.00" inputMode="decimal" value={form.montoSinItbis} onChange={(e)=>setForm((f:any)=>({...f, montoSinItbis: e.target.value}))} className="input" />
              </div>
              <div>
                <label className="block text-sm">Itbis</label>
                <input title="Itbis" aria-label="Itbis" placeholder="0.00" inputMode="decimal" value={form.itbis} onChange={(e)=>setForm((f:any)=>({...f, itbis: e.target.value}))} className="input" />
              </div>
              <div>
                <label className="block text-sm">Monto Total</label>
                <input title="Monto Total" aria-label="Monto Total" readOnly value={computeTotal().toFixed(2)} className="input bg-neutral-100" />
              </div>
              <div>
                <label className="block text-sm">Días crédito</label>
                <input title="Días crédito" aria-label="Días crédito" placeholder="0" type="number" value={form.diasCredito} onChange={(e)=>setForm((f:any)=>({...f, diasCredito: Number(e.target.value)}))} className="input" />
              </div>
              <div>
                <label className="block text-sm">Estado</label>
                <select title="Estado" aria-label="Estado" value={form.estado} onChange={(e)=>setForm((f:any)=>({...f, estado: e.target.value}))} className="input">
                  <option value="Pendiente">Pendiente</option>
                  <option value="Saldo">Saldo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm">Balance</label>
                <input title="Balance" aria-label="Balance" readOnly value={formatCurrency(computeBalance(computeTotal()))} className="input bg-neutral-100" />
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" className="btn" onClick={()=>{ setShowDeleteConfirm(false); setModalOpen(false); setEditingId(null);}}>Cancelar</button>
              {editingId ? (
                <>
                  <button type="button" className="btn btn-danger" onClick={()=>setShowDeleteConfirm(true)}>Eliminar</button>
                  <button type="submit" className="btn btn-primary">Guardar</button>
                </>
              ) : (
                <button type="submit" className="btn btn-primary">Crear</button>
              )}
            </div>
            {showDeleteConfirm && editingId && (
              <div className="mt-3 p-3 border rounded bg-yellow-50">
                <div className="mb-2">¿Está seguro que desea borrar esta factura?</div>
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn" onClick={()=>setShowDeleteConfirm(false)}>Cancelar</button>
                  <button type="button" className="btn btn-danger" onClick={async ()=>{ await deleteInvoice(editingId); setShowDeleteConfirm(false); setModalOpen(false); setEditingId(null); }}>Sí, eliminar</button>
                </div>
              </div>
            )}
           </form>
         </div>
       )}
    </div>
  );
}
