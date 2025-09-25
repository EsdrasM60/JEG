"use client";
import React, { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import PencilSquareIcon from '@heroicons/react/24/outline/PencilSquareIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import PlusCircleIcon from '@heroicons/react/24/outline/PlusCircleIcon';

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : Promise.reject(r));

function shortId(input?: string) {
  const s = String(input || '');
  let h = 0 >>> 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return String(100 + (h % 900));
}

export const dynamic = 'force-dynamic';

export default function ProveedoresPage() {
  const { data, mutate } = useSWR('/api/proveedores', fetcher);
  const list = Array.isArray(data) ? data : (data?.items || []);

  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>({ id: '', nombre: '', telefono: '', email: '', empresa: '' });

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form.nombre || !String(form.nombre).trim()) return alert('Nombre es requerido');
    setLoading(true);
    try {
      if (form.id) {
        const id = form.id;
        mutate(list.map((it:any) => (it._id === id || it.id === id ? { ...it, nombre: form.nombre, telefono: form.telefono, email: form.email, empresa: form.empresa } : it)), { revalidate: false });
        await fetch(`/api/proveedores/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: form.nombre, telefono: form.telefono, email: form.email, empresa: form.empresa }) });
      } else {
        const temp = { id: `local-${Date.now()}`, nombre: form.nombre, telefono: form.telefono, email: form.email, empresa: form.empresa };
        mutate([temp, ...list], { revalidate: false });
        await fetch('/api/proveedores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: form.nombre, telefono: form.telefono, email: form.email, empresa: form.empresa }) });
      }
    } catch (err) {
      console.error('save proveedor error', err);
      alert('Error guardando proveedor');
    } finally {
      setLoading(false);
      setForm({ id: '', nombre: '', telefono: '', email: '', empresa: '' });
      setModalOpen(false);
      mutate();
    }
  }

  function startEdit(item:any) {
    setForm({ id: item._id || item.id, nombre: item.nombre, telefono: item.telefono || '', email: item.email || '', empresa: item.empresa || '' });
    setModalOpen(true);
  }

  async function remove(id?: string) {
    if (!id) return;
    if (!confirm('Eliminar proveedor?')) return;
    mutate(list.filter((it:any) => (it._id || it.id) !== id), { revalidate: false });
    try {
      await fetch(`/api/proveedores/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('delete proveedor error', err);
      alert('Error eliminando proveedor');
    } finally {
      mutate();
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-extrabold tracking-tight">Proveedores</h1>
        <button
          className="inline-flex items-center gap-2 px-3 py-2 rounded bg-foreground text-background shadow-sm hover:shadow-md transition"
          onClick={() => { setForm({ id: '', nombre: '', telefono: '', email: '', empresa: '' }); setModalOpen(true); }}
          aria-label="Nuevo proveedor"
        >
          <PlusCircleIcon className="h-5 w-5" />
          <span className="font-medium">Nuevo</span>
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModalOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="card w-[95vw] max-w-3xl max-h-[85vh] overflow-auto">
              <div className="px-4 py-3 card-header flex items-center gap-2">
                <div className="font-semibold">{form.id ? 'Editar proveedor' : 'Nuevo proveedor'}</div>
                <button className="ml-auto btn btn-ghost" onClick={() => setModalOpen(false)}>Cerrar</button>
              </div>
              <form onSubmit={submit} className="p-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm mb-1">Nombre</label>
                  <input className="w-full input" title="Nombre" placeholder="Nombre" value={form.nombre} onChange={(e)=>setForm({...form, nombre: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm mb-1">Teléfono</label>
                  <input className="w-full input" title="Teléfono" placeholder="Teléfono" value={form.telefono} onChange={(e)=>setForm({...form, telefono: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Email</label>
                  <input className="w-full input" title="Email" placeholder="correo@ejemplo.com" value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Empresa</label>
                  <input className="w-full input" title="Empresa" placeholder="Empresa" value={form.empresa} onChange={(e)=>setForm({...form, empresa: e.target.value})} />
                </div>

                <div className="sm:col-span-2 flex items-center gap-3 pt-2 justify-end">
                  <button type="button" className="btn" onClick={() => setModalOpen(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">{loading ? 'Guardando...' : 'Guardar'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="text-left border-b bg-neutral-50">
              <th className="py-3 px-2 font-semibold uppercase text-neutral-700 tracking-wide">Nombre</th>
              <th className="py-3 px-2 font-semibold uppercase text-neutral-700 tracking-wide">ID</th>
              <th className="py-3 px-2 font-semibold uppercase text-neutral-700 tracking-wide">Correo</th>
              <th className="py-3 px-2 font-semibold uppercase text-neutral-700 tracking-wide">Teléfono</th>
              <th className="py-3 px-2 font-semibold uppercase text-neutral-700 tracking-wide">Empresa</th>
              <th className="py-3 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((v:any) => (
              <tr key={v._id || v.id} className="border-b hover:bg-white/50 transition-colors">
                <td className="py-3 px-2">
                  <span className="font-medium text-neutral-900">{v.nombre}</span>
                </td>
                <td className="whitespace-nowrap py-3 px-2">
                  <div className="flex items-center gap-2" title={String(v._id || v.id)}>
                    <code className="text-sm font-mono text-neutral-700 bg-neutral-100 px-2 py-1 rounded">{shortId(v._id || v.id)}</code>
                  </div>
                </td>
                <td className="py-3 px-2 text-neutral-700">{v.email || '—'}</td>
                <td className="py-3 px-2 text-neutral-700">{v.telefono || '—'}</td>
                <td className="py-3 px-2 text-neutral-700">{v.empresa || '—'}</td>
                <td className="text-right whitespace-nowrap py-3 px-2">
                  <button
                    className="p-1 mr-2 border rounded inline-flex items-center justify-center hover:bg-muted transition"
                    onClick={() => startEdit(v)}
                    title="Editar"
                    aria-label="Editar"
                  >
                    <PencilSquareIcon className="h-5 w-5" />
                  </button>
                  <button
                    className="p-1 border rounded inline-flex items-center justify-center hover:bg-red-50 text-red-600 transition"
                    onClick={() => remove(v._id || v.id)}
                    title="Eliminar"
                    aria-label="Eliminar"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
