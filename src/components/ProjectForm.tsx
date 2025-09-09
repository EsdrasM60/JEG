"use client";

import React, { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ProjectForm() {
  const { mutate } = useSWR("/api/proyectos?page=1&pageSize=1000", fetcher);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState("PLANIFICADO");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!titulo.trim()) return setError("Título requerido");
    setLoading(true);
    try {
      const res = await fetch("/api/proyectos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titulo: titulo.trim(), descripcion: descripcion.trim(), estado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "error");
      setTitulo("");
      setDescripcion("");
      setEstado("PLANIFICADO");
      mutate();
    } catch (err: any) {
      setError(err.message || "Unexpected");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-4 bg-white rounded shadow mb-4">
      <h3 className="text-lg font-semibold mb-2">Crear proyecto</h3>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <div className="mb-2">
        <label className="block text-sm">Título</label>
        <input className="w-full border px-2 py-1" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>
      <div className="mb-2">
        <label className="block text-sm">Descripción</label>
        <input className="w-full border px-2 py-1" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </div>
      <div className="mb-2">
        <label className="block text-sm">Estado</label>
        <select className="w-full border px-2 py-1" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="PLANIFICADO">PLANIFICADO</option>
          <option value="EN_PROGRESO">EN_PROGRESO</option>
          <option value="EN_PAUSA">EN_PAUSA</option>
          <option value="COMPLETADO">COMPLETADO</option>
        </select>
      </div>
      <button className="bg-blue-600 text-white px-3 py-1 rounded" disabled={loading}>{loading ? "Guardando..." : "Crear"}</button>
    </form>
  );
}
