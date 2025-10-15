"use client";
import React, { useMemo, useState } from 'react';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { toISOFromDateInput, formatDateTz, inputDateFromStored } from '@/lib/dates';

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : Promise.reject(r));

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function formatDate(d: string | Date | undefined) {
  return formatDateTz(d);
}

export const dynamic = 'force-dynamic';

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
  // payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<any | null>(null);
  const [paymentMonto, setPaymentMonto] = useState<string>('');
  const [paymentFecha, setPaymentFecha] = useState<string>(inputDateFromStored(new Date().toISOString()));
  const [paymentMetodo, setPaymentMetodo] = useState<string>('');
  const [paymentNota, setPaymentNota] = useState<string>('');
  const [form, setForm] = useState<any>({
    fecha: inputDateFromStored(new Date().toISOString()),
    proveedorId: '',
    proveedor: '',
    proyectoId: '',
    factura: '',
    facturaId: '',
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

  React.useEffect(() => {
    const mapped = (items || []).map((inv: any) => {
      const meta = inv.metadata || {};
      const montoSin = (inv.montoSinItbis ?? meta.montoSinItbis ?? inv.monto ?? 0);
      const itbis = (inv.itbis ?? meta.itbis ?? 0);
      const total = (inv.totalAmount ?? meta.totalAmount ?? montoSin + itbis);
      const balance = (inv.balance ?? meta.balance ?? inv.monto ?? total);
      return {
        ...inv,
        montoSinItbis: montoSin,
        itbis: itbis,
        totalAmount: total,
        diasCredito: inv.diasCredito ?? meta.diasCredito ?? 0,
        estado: inv.estado ?? meta.estado ?? 'Pendiente',
        balance: balance,
        proveedor: (inv.proveedor ?? meta.proveedorLabel ?? meta.proveedor) ?? '',
        proveedorId: (inv.proveedorId ?? meta.proveedorId) ?? undefined,
        factura: (inv.factura ?? meta.factura) ?? '',
      };
    });
    setLocalInvoices(mapped);
   }, [items]);
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
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      if (sortKey === 'fecha') {
        return sortDir === 'asc' ? new Date(String(av)).getTime() - new Date(String(bv)).getTime() : new Date(String(bv)).getTime() - new Date(String(av)).getTime();
      }
      if (typeof av === 'number' || typeof bv === 'number') return sortDir === 'asc' ? (Number(av) - Number(bv)) : (Number(bv) - Number(av));
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });

    // compute cumulative running balance: running = previous running + current totalAmount
    let running = 0;
    const withRunning = sorted.map((inv:any) => {
      const amt = Number(inv.totalAmount ?? inv.monto ?? 0) || 0;
      running = running + amt;
      return { ...inv, runningBalance: running };
    });

    return withRunning;
  }, [localInvoices, proveedorFilter, projectFilter, estadoFilter, sortKey, sortDir, proyectoMap]);

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
    const generatedFacturaId = form.facturaId || ((typeof globalThis !== 'undefined' && (globalThis as any).crypto && (globalThis as any).crypto.randomUUID) ? (globalThis as any).crypto.randomUUID() : `f-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
    const newInv = {
      id: `local-${Date.now()}`,
      fecha: toISOFromDateInput(form.fecha),
      proveedorId: form.proveedorId,
      proveedor: form.proveedor,
      factura: form.factura,
      facturaId: generatedFacturaId,
      montoSinItbis: Number(form.montoSinItbis) || 0,
      itbis: Number(form.itbis) || 0,
      totalAmount: (Number(form.montoSinItbis) || 0) + (Number(form.itbis) || 0),
      diasCredito: Number(form.diasCredito) || 0,
      estado: form.estado,
      balance: computeBalance((Number(form.montoSinItbis) || 0) + (Number(form.itbis) || 0)),
    };

    setLocalInvoices(prev => [newInv, ...prev]);
    setModalOpen(false);
    try {
      const res = await fetch('/api/finanzas/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: newInv.fecha,
          factura: newInv.factura,
          invoiceTipo: newInv.diasCredito && Number(newInv.diasCredito) > 0 ? 'CREDITO' : 'CONTADO',
          montoSinItbis: newInv.montoSinItbis,
          itbis: newInv.itbis,
          totalAmount: newInv.totalAmount,
          proyectoId: newInv.proyectoId || undefined,
          nota: `Factura: ${newInv.factura} Proveedor: ${newInv.proveedor || ''} DiasCredito:${newInv.diasCredito}`,
          proveedorId: newInv.proveedorId,
          proveedor: newInv.proveedor,
          categoria: 'CxP',
          metadata: { estado: newInv.estado, paymentMethod: newInv.diasCredito && Number(newInv.diasCredito) > 0 ? 'Credito' : 'Contado', facturaId: generatedFacturaId }
        })
      });
      if (res.ok) {
        const data = await res.json().catch(()=>null);
        if (data && data.metadata && data.metadata.facturaId) {
          setLocalInvoices(prev => prev.map(inv => (inv.id === newInv.id ? { ...inv, metadata: { ...(inv.metadata||{}), facturaId: data.metadata.facturaId }, _id: data._id || inv._id } : inv)));
        }
      }
    } catch (err) {
      console.error('persist cxP invoice error', err);
    }
  }

  function openEdit(inv: any) {
    setEditingId(inv._id || inv.id || null);
    setForm({
      fecha: inputDateFromStored(inv.fecha ? inv.fecha : new Date().toISOString()),
      proveedorId: inv.proveedorId || inv.metadata?.proveedorId || '',
      proveedor: inv.proveedor || inv.metadata?.proveedorLabel || '',
      proyectoId: inv.proyectoId || '',
      factura: inv.factura || inv.metadata?.factura || '',
      facturaId: inv.metadata?.facturaId || inv.facturaId || '',
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

  // open payment modal
  function openPayment(inv: any) {
    setPaymentInvoice(inv);
    setPaymentMonto(String(Number(inv.metadata?.balance ?? inv.balance ?? inv.totalAmount ?? 0).toFixed ? Number((inv.metadata?.balance ?? inv.balance ?? inv.totalAmount ?? 0)).toFixed(2) : (inv.metadata?.balance ?? inv.balance ?? inv.totalAmount ?? 0)));
    setPaymentFecha(inputDateFromStored(new Date().toISOString()));
    setPaymentMetodo('');
    setPaymentNota('');
    setPaymentModalOpen(true);
  }

  async function submitPayment(e?: React.FormEvent) {
    e?.preventDefault();
    if (!paymentInvoice) return;
    const invoiceId = paymentInvoice._id || paymentInvoice.id;
    const montoNum = Number(String(paymentMonto).replace(/[^0-9.-]+/g,'')) || 0;
    if (montoNum <= 0) return alert('Monto debe ser mayor que 0');
    try {
      const res = await fetch('/api/finanzas/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invoiceId, monto: montoNum, fecha: paymentFecha, metodo: paymentNota, nota: paymentNota }) });
      if (!res.ok) throw res;
      const data = await res.json();
      setLocalInvoices(prev => prev.map(inv => {
        const id = inv._id || inv.id;
        if (String(id) === String(invoiceId)) {
          const updated = { ...inv };
          const newBal = data.invoice?.metadata?.balance ?? (updated.metadata?.balance ?? updated.balance) - montoNum;
          updated.metadata = { ...(updated.metadata || {}), balance: newBal, estado: data.invoice?.metadata?.estado ?? (newBal <= 0 ? 'Pagado' : 'Parcial') };
          updated.balance = newBal;
          return updated;
        }
        return inv;
      }));
      setPaymentModalOpen(false);
      setPaymentInvoice(null);
      try { mutate(`/api/finanzas/cxp?desde=${yearStart}&hasta=${yearEnd}&page=${page}&pageSize=${pageSize}`); mutate('/api/finanzas/summary'); } catch (e) {}
    } catch (err) {
      console.error('submit payment error', err);
      alert('Error registrando pago');
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
                <tr key={inv._id || inv.id} className="">
                  <td className="p-4 border-b border-neutral-200">{formatDate(inv.fecha)}</td>
                  <td className="p-4 border-b border-neutral-200">{inv.proveedor || '-'}</td>
                  <td className="p-4 border-b border-neutral-200">{inv.proyectoName || inv.proyectoId || '-'}</td>
                  <td className="p-4 border-b border-neutral-200">{inv.factura || '-'}</td>
                  <td className="p-4 border-b border-neutral-200 text-right">{formatCurrency(Number(inv.montoSinItbis) || 0)}</td>
                  <td className="p-4 border-b border-neutral-200 text-right">{formatCurrency(Number(inv.itbis) || 0)}</td>
                  <td className="p-4 border-b border-neutral-200 text-right">{formatCurrency(Number(inv.totalAmount) || 0)}</td>
                  <td className="p-4 border-b border-neutral-200">{inv.diasCredito}</td>
                  <td className="p-4 border-b border-neutral-200">{inv.estado}</td>
                  <td className="p-4 border-b border-neutral-200 text-right">{formatCurrency(Number(inv.runningBalance ?? inv.balance) || 0)}</td>
                  <td className="p-4 border-b border-neutral-200">
                    <div className="flex items-center gap-2 justify-end">
                      <button className="btn btn-ghost" onClick={(e)=>{ e.stopPropagation(); openPayment(inv); }} title="Registrar pago">Pagar</button>
                      <button className="btn btn-ghost" onClick={(e)=>{ e.stopPropagation(); openEdit(inv); }} title="Editar">Editar</button>
                    </div>
                  </td>
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
      
      {/* Payment modal */}
      {paymentModalOpen && paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPaymentModalOpen(false)} />
          <form onSubmit={submitPayment} className="relative z-50 bg-white p-4 rounded shadow w-[95vw] max-w-md">
            <h3 className="text-lg font-semibold mb-2">Registrar pago - {paymentInvoice.factura || paymentInvoice._id}</h3>
            <div className="grid grid-cols-1 gap-3">
              <label className="block">
                <span className="text-sm">Fecha</span>
                <input title="Fecha pago" aria-label="Fecha pago" type="date" value={paymentFecha} onChange={(e)=>setPaymentFecha(e.target.value)} className="input" required />
              </label>
              <label className="block">
                <span className="text-sm">Monto</span>
                <input title="Monto pago" aria-label="Monto pago" inputMode="decimal" value={paymentMonto} onChange={(e)=>setPaymentMonto(e.target.value)} className="input" required />
              </label>
              <label className="block">
                <span className="text-sm">Método</span>
                <input title="Método" aria-label="Método" value={paymentMetodo} onChange={(e)=>setPaymentMetodo(e.target.value)} className="input" />
              </label>
              <label className="block">
                <span className="text-sm">Nota</span>
                <input title="Nota" aria-label="Nota" value={paymentNota} onChange={(e)=>setPaymentNota(e.target.value)} className="input" />
              </label>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" className="btn" onClick={()=>{ setPaymentModalOpen(false); setPaymentInvoice(null); }}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Registrar pago</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
