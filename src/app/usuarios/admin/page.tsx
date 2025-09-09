"use client";
import useSWR from "swr";
import { useState } from "react";
import { useSession } from "next-auth/react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminUsersPage() {
  const { data, mutate } = useSWR("/api/admin/users", fetcher);
  const { data: session } = useSession();

  const myRole = (session?.user as any)?.role as string | undefined;
  const canManage = myRole === "ADMIN" || myRole === "COORDINADOR";
  const canDelete = myRole === "ADMIN";

  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<{ name?: string; email?: string }>({});
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "VOLUNTARIO",
    approved: true,
  });

  async function approve(id: string) {
    await fetch(`/api/admin/users/${id}/approve`, { method: "POST" });
    mutate();
  }
  async function changeRole(id: string, role: string) {
    await fetch(`/api/admin/users/${id}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    mutate();
  }
  async function save(id: string) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditing(null);
    setForm({});
    mutate();
  }
  async function remove(id: string) {
    if (!confirm("¿Eliminar usuario?")) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    mutate();
  }
  async function createUser() {
    const res = await fetch(`/api/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    if (!res.ok) {
      alert("Error creando usuario");
      return;
    }
    setCreating(false);
    setCreateForm({ name: "", email: "", password: "", role: "VOLUNTARIO", approved: true });
    mutate();
  }

  const users = (data ?? []) as Array<any>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Administración de usuarios</h1>
        {canManage && (
          <button
            className="px-3 py-2 rounded bg-green-600 text-white"
            onClick={() => setCreating((v) => !v)}
          >
            {creating ? "Cancelar" : "+ Nuevo usuario"}
          </button>
        )}
      </div>

      {creating && canManage && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            className="border rounded px-3 py-2"
            placeholder="Nombre"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Email"
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Contraseña"
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
          />
          <select
            className="border rounded px-3 py-2"
            value={createForm.role}
            onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
          >
            <option value="VOLUNTARIO">VOLUNTARIO</option>
            <option value="COORDINADOR">COORDINADOR</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={createForm.approved}
              onChange={(e) => setCreateForm({ ...createForm, approved: e.target.checked })}
            />
            Aprobado
          </label>
          <div className="md:col-span-5">
            <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={createUser}>
              Crear usuario
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="py-2">
                  {editing === u.id ? (
                    <input
                      className="border rounded px-2 py-1"
                      defaultValue={u.name || ""}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      disabled={!canManage}
                    />
                  ) : (
                    u.name || "—"
                  )}
                </td>
                <td>
                  {editing === u.id ? (
                    <input
                      className="border rounded px-2 py-1"
                      defaultValue={u.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      disabled={!canManage}
                    />
                  ) : (
                    u.email
                  )}
                </td>
                <td>
                  <select
                    className="border rounded px-2 py-1"
                    defaultValue={u.role || "VOLUNTARIO"}
                    onChange={(e) => changeRole(u.id as string, e.target.value)}
                    disabled={!canManage}
                  >
                    <option>VOLUNTARIO</option>
                    <option>COORDINADOR</option>
                    <option>ADMIN</option>
                  </select>
                </td>
                <td>{u.emailVerified ? "Aprobado" : "Pendiente"}</td>
                <td className="space-x-2 py-2">
                  {editing === u.id ? (
                    <>
                      <button className="px-3 py-1 rounded border" onClick={() => setEditing(null)}>Cancelar</button>
                      <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={() => save(u.id as string)} disabled={!canManage}>Guardar</button>
                    </>
                  ) : (
                    <>
                      {!u.emailVerified && canManage && (
                        <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={() => approve(u.id as string)}>Aprobar</button>
                      )}
                      {canManage && (
                        <button
                          className="px-3 py-1 rounded border"
                          onClick={() => { setEditing(u.id as string); setForm({ name: u.name || "", email: u.email }); }}
                        >
                          Editar
                        </button>
                      )}
                      {canDelete && (
                        <button className="px-3 py-1 rounded border text-red-600" onClick={() => remove(u.id as string)}>Eliminar</button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
