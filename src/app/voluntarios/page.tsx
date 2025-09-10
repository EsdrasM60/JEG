"use client";
import useSWR from "swr";
import { useState } from "react";
import { PencilSquareIcon, TrashIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: "include" });
  let data: any = null;
  try { data = await r.json(); } catch {}
  return { ok: r.ok, status: r.status, data } as { ok: boolean; status: number; data: any };
};

// ID corto estable (100-999) derivado del id real
function shortId(input?: string) {
  const s = String(input || "");
  let h = 0 >>> 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const code = 100 + (h % 900);
  return String(code);
}

export default function VoluntariosPage() {
  const { data: res, mutate } = useSWR("/api/voluntarios", fetcher);
  const items = Array.isArray(res?.data) ? res!.data : [];
  const unauthorized = res && res.status === 401;
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    congregacion: "",
    empresa: "",
    cargo: "Tecnico",
  });
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = { ...form };
    // prefer empresa over congregacion when present
    if (body.empresa) body.congregacion = body.empresa;
    const res = await fetch("/api/voluntarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setForm({ nombre: "", apellido: "", email: "", telefono: "", congregacion: "", empresa: "", cargo: "Tecnico" });
      setShowCreate(false);
      mutate();
    } else {
      const msg = await res.json().catch(() => ({}));
      if (res.status === 409) {
        alert(msg?.error || "El voluntario ya existe");
      } else {
        alert(msg?.error || "Error guardando");
      }
    }
  }

  async function startEdit(v: any) {
    setEditing(v.id);
    setEditForm({
      nombre: v.nombre,
      apellido: v.apellido,
      email: v.email || "",
      telefono: v.telefono || "",
      congregacion: v.congregacion || "",
      empresa: v.empresa || v.congregacion || "",
      cargo: v.cargo || "Tecnico",
    });
    setShowEdit(true);
  }

  async function saveEdit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!editing) return;
    const body = { ...editForm };
    if (body.empresa) body.congregacion = body.empresa;
    await fetch(`/api/voluntarios/${editing}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setEditing(null);
    setEditForm({});
    setShowEdit(false);
    mutate();
  }

  async function del(id: string) {
    if (!confirm("¿Eliminar empleado?")) return;
    await fetch(`/api/voluntarios/${id}`, { method: "DELETE" });
    mutate();
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Empleados</h1>
        <button
          className="inline-flex items-center gap-2 px-3 py-2 rounded bg-foreground text-background"
          onClick={() => setShowCreate(true)}
          aria-label="Nuevo empleado"
        >
          <PlusCircleIcon className="h-5 w-5" />
          <span>Nuevo</span>
        </button>
      </div>

      {unauthorized ? (
        <div className="p-4 rounded border bg-yellow-50 text-yellow-800">
          Necesitas iniciar sesión para ver esta sección. {" "}
          <Link href="/signin" className="underline">Ir a iniciar sesión</Link>
        </div>
      ) : null}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="card w-[95vw] max-w-3xl max-h-[85vh] overflow-auto">
              <div className="px-4 py-3 card-header flex items-center gap-2">
                <div className="font-semibold">Nuevo empleado</div>
                <button className="ml-auto btn btn-ghost" onClick={() => setShowCreate(false)}>Cerrar</button>
              </div>
              <form onSubmit={submit} className="p-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm mb-1">Nombre</label>
                  <input
                    className="w-full input"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Apellido</label>
                  <input
                    className="w-full input"
                    value={form.apellido}
                    onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Correo</label>
                  <input
                    className="w-full input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Teléfono</label>
                  <input
                    className="w-full input"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Empresa</label>
                  <input
                    className="w-full input"
                    value={form.empresa}
                    onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">Cargo</label>
                  <select
                    className="w-full input"
                    value={form.cargo}
                    onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                  >
                    <option value="Supervisor">Supervisor</option>
                    <option value="Tecnico">Tecnico</option>
                    <option value="Contratista">Contratista</option>
                  </select>
                </div>

                <div className="sm:col-span-2 flex items-center gap-3 pt-2 justify-end">
                  <button type="button" className="btn" onClick={() => setShowCreate(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setShowEdit(false); setEditing(null); }} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="card w-[95vw] max-w-3xl max-h-[85vh] overflow-auto">
              <div className="px-4 py-3 card-header flex items-center gap-2">
                <div className="font-semibold">Editar empleado</div>
                <button className="ml-auto btn btn-ghost" onClick={() => { setShowEdit(false); setEditing(null); }}>Cerrar</button>
              </div>
              <form onSubmit={saveEdit} className="p-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm mb-1">Nombre</label>
                  <input
                    className="w-full input"
                    value={editForm.nombre || ""}
                    onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Apellido</label>
                  <input
                    className="w-full input"
                    value={editForm.apellido || ""}
                    onChange={(e) => setEditForm({ ...editForm, apellido: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Correo</label>
                  <input
                    className="w-full input"
                    type="email"
                    value={editForm.email || ""}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Teléfono</label>
                  <input
                    className="w-full input"
                    value={editForm.telefono || ""}
                    onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Empresa</label>
                  <input
                    className="w-full input"
                    value={editForm.empresa || ""}
                    onChange={(e) => setEditForm({ ...editForm, empresa: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">Cargo</label>
                  <select
                    className="w-full input"
                    value={editForm.cargo || "Tecnico"}
                    onChange={(e) => setEditForm({ ...editForm, cargo: e.target.value })}
                  >
                    <option value="Supervisor">Supervisor</option>
                    <option value="Tecnico">Tecnico</option>
                    <option value="Contratista">Contratista</option>
                  </select>
                </div>

                <div className="sm:col-span-2 flex items-center gap-3 pt-2 justify-end">
                  <button type="button" className="btn" onClick={() => { setShowEdit(false); setEditing(null); }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Listado */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Nombre</th>
              <th>ID</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th>Empresa</th>
              <th>Cargo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((v: any) => (
              <tr key={v.id || v._id} className="border-b">
                <td className="py-2">
                  <span>{v.nombre} {v.apellido}</span>
                </td>
                <td className="whitespace-nowrap">
                  <div className="flex items-center gap-2" title={String(v.id || v._id)}>
                    <code className="text-xs font-mono text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded">{v.shortId || shortId(v.id || v._id)}</code>
                  </div>
                </td>
                <td>{v.email || "—"}</td>
                <td>{v.telefono || "—"}</td>
                <td>{v.empresa || v.congregacion || "—"}</td>
                <td>{v.cargo || "—"}</td>
                <td className="text-right whitespace-nowrap py-2">
                  <button
                    className="p-1 mr-2 border rounded inline-flex items-center justify-center hover:bg-muted"
                    onClick={() => startEdit(v)}
                    title="Editar"
                    aria-label="Editar"
                  >
                    <PencilSquareIcon className="h-5 w-5" />
                  </button>
                  <button
                    className="p-1 border rounded inline-flex items-center justify-center hover:bg-red-50 text-red-600"
                    onClick={() => del(v.id)}
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
