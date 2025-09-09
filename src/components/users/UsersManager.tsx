"use client";
import useSWR from "swr";
import { useState } from "react";
import { useSession } from "next-auth/react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function UsersManager() {
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
  const [loadingApprove, setLoadingApprove] = useState<string | null>(null);

  async function approve(id: string) {
    if (!canManage) return;
    setLoadingApprove(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/approve`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "No se pudo aprobar");
      }
      await mutate();
    } finally {
      setLoadingApprove(null);
    }
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
  async function remove(id: string, role?: string) {
    if (role === "ADMIN" && !confirm("Estás eliminando un ADMIN. ¿Continuar?")) return;
    if (!confirm("¿Eliminar usuario?")) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    mutate();
  }
  async function createUser(e?: React.FormEvent) {
    if (e) e.preventDefault();
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuarios</h1>
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
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCreating(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="card w-[95vw] max-w-2xl max-h-[85vh] overflow-auto">
              <div className="px-4 py-3 card-header flex items-center gap-2">
                <div className="font-semibold">Nuevo usuario</div>
                <button className="ml-auto btn btn-ghost" onClick={() => setCreating(false)}>Cerrar</button>
              </div>
              <form onSubmit={createUser} className="p-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm">Nombre</label>
                  <input className="input w-full" placeholder="Nombre" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm">Email</label>
                  <input className="input w-full" placeholder="Email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm">Contraseña</label>
                  <input className="input w-full" placeholder="Contraseña" type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm">Rol</label>
                  <select className="input w-full" value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
                    <option value="VOLUNTARIO">VOLUNTARIO</option>
                    <option value="COORDINADOR">COORDINADOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={createForm.approved} onChange={(e) => setCreateForm({ ...createForm, approved: e.target.checked })} />
                    Aprobado
                  </label>
                </div>
                <div className="sm:col-span-2 text-right pt-2">
                  <button type="submit" className="btn btn-primary">Crear usuario</button>
                </div>
              </form>
            </div>
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
                        <button
                          className={"px-3 py-1 rounded text-white " + (loadingApprove === u.id ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700")}
                          onClick={() => approve(u.id as string)}
                          disabled={loadingApprove === u.id}
                        >
                          {loadingApprove === u.id ? "Aprobando..." : "Aprobar"}
                        </button>
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
                        <button className="px-3 py-1 rounded border text-red-600" onClick={() => remove(u.id as string, u.role)}>Eliminar</button>
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
