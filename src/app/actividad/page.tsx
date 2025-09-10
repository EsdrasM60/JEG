"use client";

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from "react";

async function fetchActividades(projectId?: string) {
  const url = new URL(`/api/actividad`, (typeof window !== 'undefined' ? window.location.origin : ''));
  if (projectId) url.searchParams.set("projectId", projectId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Fetch failed");
  return res.json();
}

export default function ActividadPage() {
  const [projectId, setProjectId] = useState("");
  const [actividades, setActividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("");
  const [descripcion, setDescripcion] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchActividades(projectId)
      .then((d) => setActividades(d))
      .catch(() => alert("Error cargando"))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/actividad`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, titulo, tipo, descripcion }),
    });
    if (!res.ok) return alert("Error creando");
    const body = await res.json();
    setActividades((s) => [{ id: body.id, projectId, titulo, tipo, descripcion, fecha: new Date().toISOString() }, ...s]);
    setTitulo("");
    setTipo("");
    setDescripcion("");
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold">Actividad</h1>
      <div className="mt-4 mb-6">
        <form onSubmit={handleCreate} className="flex gap-2 items-end">
          <input placeholder="Project ID" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input" />
          <input placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="input" />
          <input placeholder="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className="input" />
          <input placeholder="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="input" />
          <button className="btn btn-primary">Crear</button>
        </form>
      </div>

      <div>
        {loading ? (
          <div>Cargando...</div>
        ) : actividades.length === 0 ? (
          <div className="text-sm text-muted">No hay actividades</div>
        ) : (
          <ul className="space-y-2">
            {actividades.map((a) => (
              <li key={a.id} className="p-2 border rounded">
                <div className="text-sm text-muted">{new Date(a.fecha).toLocaleString()}</div>
                <div className="font-semibold">{a.titulo}</div>
                <div className="text-sm">{a.tipo}</div>
                <div className="text-sm">{a.descripcion}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
