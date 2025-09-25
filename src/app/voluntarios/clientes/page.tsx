"use client";
import React, { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { PencilSquareIcon, TrashIcon, PlusCircleIcon } from '@heroicons/react/24/outline';

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : Promise.reject(r));

// short stable id helper (100-999)
function shortId(input?: string) {
  const s = String(input || '');
  let h = 0 >>> 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return String(100 + (h % 900));
}

export default function ClientesPage() {
  const { data, mutate } = useSWR('/api/clientes', fetcher);
  const list = Array.isArray(data) ? data : (data?.items || []);

  const [form, setForm] = useState({ nombre: '', telefono: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  type ClientForm = { id?: string; nombre: string; telefono?: string; email?: string; empresa?: string; rnc?: string };
  const [clientForm, setClientForm] = useState<ClientForm>({ id: '', nombre: '', telefono: '', email: '', empresa: '', rnc: '' });

  async function createClient(e?: React.FormEvent) {
    e?.preventDefault();
    if (!clientForm.nombre.trim()) return alert('Nombre es requerido');
    setLoading(true);
    try {
      if (clientForm.id) {
        // update existing
        const id = clientForm.id;
        // optimistic update
        mutate(list.map((it:any) => it._id === id || it.id === id ? { ...it, nombre: clientForm.nombre, telefono: clientForm.telefono, email: clientForm.email, empresa: clientForm.empresa, rnc: clientForm.rnc } : it), { revalidate: false });
        await fetch(`/api/clientes/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: clientForm.nombre, telefono: clientForm.telefono, email: clientForm.email, empresa: clientForm.empresa, rnc: clientForm.rnc })
        });
      } else {
        // create new
        const temp = { id: `local-${Date.now()}`, nombre: clientForm.nombre, telefono: clientForm.telefono, email: clientForm.email, empresa: clientForm.empresa, rnc: clientForm.rnc };
        mutate([temp, ...list], { revalidate: false });
        await fetch('/api/clientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: clientForm.nombre, telefono: clientForm.telefono, email: clientForm.email, empresa: clientForm.empresa, rnc: clientForm.rnc })
        });
      }
    } catch (err) {
      console.error('create/update cliente error', err);
      alert('Error guardando cliente');
    } finally {
      setLoading(false);
      setClientForm({ id: '', nombre: '', telefono: '', email: '', empresa: '', rnc: '' });
      setModalOpen(false);
      mutate();
    }
  }

  function openEdit(item:any) {
    setClientForm({ id: item._id || item.id, nombre: item.nombre, telefono: item.telefono || '', email: item.email || '', empresa: item.empresa || '', rnc: item.rnc || '' });
    setModalOpen(true);
  }

  async function deleteClient(id:string) {
    if (!confirm('Eliminar cliente?')) return;
    // optimistic remove
    mutate(list.filter((it:any)=> (it._id||it.id) !== id), { revalidate: false });
    try {
      await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('delete cliente error', err);
      alert('Error eliminando cliente');
    } finally {
      mutate();
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-extrabold tracking-tight">Clientes</h1>
        <button
          className="inline-flex items-center gap-2 px-3 py-2 rounded bg-foreground text-background shadow-sm hover:shadow-md transition"
          onClick={() => { setClientForm({ id: '', nombre: '', telefono: '', email: '', empresa: '', rnc: '' }); setModalOpen(true); }}
          aria-label="Nuevo cliente"
        >
          <PlusCircleIcon className="h-5 w-5" />
          <span className="font-medium">Nuevo</span>
        </button>
      </div>

      {/* Modal (create/edit) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModalOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="card w-[95vw] max-w-3xl max-h-[85vh] overflow-auto">
              <div className="px-4 py-3 card-header flex items-center gap-2">
                <div className="font-semibold">{clientForm.id ? 'Editar cliente' : 'Nuevo cliente'}</div>
                <button className="ml-auto btn btn-ghost" onClick={() => setModalOpen(false)}>Cerrar</button>
              </div>
              <form onSubmit={createClient} className="p-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm mb-1">Nombre</label>
                  <input
                    className="w-full input"
                    title="Nombre"
                    placeholder="Nombre"
                    value={clientForm.nombre}
                    onChange={(e) => setClientForm({ ...clientForm, nombre: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Teléfono</label>
                  <input
                    className="w-full input"
                    title="Teléfono"
                    placeholder="Teléfono"
                    value={clientForm.telefono}
                    onChange={(e) => setClientForm({ ...clientForm, telefono: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Email</label>
                  <input
                    className="w-full input"
                    title="Email"
                    placeholder="correo@ejemplo.com"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Empresa</label>
                  <input
                    className="w-full input"
                    title="Empresa"
                    placeholder="Empresa"
                    value={clientForm.empresa}
                    onChange={(e) => setClientForm({ ...clientForm, empresa: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">RNC</label>
                  <input
                    className="w-full input"
                    title="RNC"
                    placeholder="RNC"
                    value={clientForm.rnc}
                    onChange={(e) => setClientForm({ ...clientForm, rnc: e.target.value })}
                  />
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

      {/* Listado */}
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="text-left border-b bg-neutral-50">
              <th className="py-3 px-2 font-semibold uppercase text-neutral-700 tracking-wide">Nombre</th>
              <th className="py-3 px-2 font-semibold uppercase text-neutral-700 tracking-wide">ID</th>
              <th className="py-3 px-2 font-semibold uppercase text-neutral-700 tracking-wide">Correo</th>
              <th className="py-3 px-2 font-semibold uppercase text-neutral-700 tracking-wide">Teléfono</th>
              <th className="py-3 px-2 font-semibold uppercase text-neutral-700 tracking-wide">Empresa</th>
              <th className="py-3 px-2 font-semibold uppercase text-neutral-700 tracking-wide">RNC</th>
              <th className="py-3 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((c: any) => (
              <tr key={c._id || c.id} className="border-b hover:bg-white/50 transition-colors">
                <td className="py-3 px-2">
                  <span className="font-medium text-neutral-900">{c.nombre}</span>
                </td>
                <td className="whitespace-nowrap py-3 px-2">
                  <div className="flex items-center gap-2" title={String(c._id || c.id)}>
                    <code className="text-sm font-mono text-neutral-700 bg-neutral-100 px-2 py-1 rounded">{shortId(c._id || c.id)}</code>
                  </div>
                </td>
                <td className="py-3 px-2 text-neutral-700">{c.email || '—'}</td>
                <td className="py-3 px-2 text-neutral-700">{c.telefono || '—'}</td>
                <td className="py-3 px-2 text-neutral-700">{c.empresa || '—'}</td>
                <td className="py-3 px-2 text-neutral-700">{c.rnc || '—'}</td>
                <td className="text-right whitespace-nowrap py-3 px-2">
                  <button
                    className="p-1 mr-2 border rounded inline-flex items-center justify-center hover:bg-muted transition"
                    onClick={() => openEdit(c)}
                    title="Editar"
                    aria-label="Editar"
                  >
                    <PencilSquareIcon className="h-5 w-5" />
                  </button>
                  <button
                    className="p-1 border rounded inline-flex items-center justify-center hover:bg-red-50 text-red-600 transition"
                    onClick={() => deleteClient(c._id || c.id)}
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
