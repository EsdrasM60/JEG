"use client";
import useSWR from "swr";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Programa = {
  _id: string;
  fichaId: any;
  voluntarioId: any;
  ayudanteId?: any;
  asignadoFecha: string;
  completadoFecha?: string | null;
  notas?: string | null;
}

type Ficha = { _id: string; id?: string; titulo: string };

type Volunteer = { _id: string; nombre: string; apellido: string };

export default function ProgramaPage() {
  const [saving, setSaving] = useState(false);
  const { data: fichas } = useSWR<{ items: Ficha[] }>("/api/tareas/fichas?page=1&pageSize=1000&sort=alpha", fetcher);
  const { data: voluntarios } = useSWR<{ items: Volunteer[] }>("/api/voluntarios", fetcher);
  const { data: lista, mutate } = useSWR<{ items: Programa[] }>("/api/tareas/programa?page=1&pageSize=50", fetcher);

  async function crear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      fichaId: fd.get("fichaId"),
      voluntarioId: fd.get("voluntarioId"),
      ayudanteId: fd.get("ayudanteId") || null,
      asignadoFecha: fd.get("asignadoFecha"),
      completadoFecha: fd.get("completadoFecha") || null,
      notas: fd.get("notas") || null,
    } as any;
    setSaving(true);
    await fetch("/api/tareas/programa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    e.currentTarget.reset();
    mutate();
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Programa</h1>
      <form onSubmit={crear} className="border rounded p-3 grid gap-3 md:grid-cols-2 bg-white">
        <div>
          <label className="block text-sm mb-1">Ficha</label>
          <select name="fichaId" className="w-full border rounded px-2 py-1" required>
            <option value="">Seleccione ficha</option>
            {fichas?.items?.map((f) => (
              <option key={f._id || f.id} value={f._id || f.id}>{f.titulo}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Supervisor</label>
          <select name="voluntarioId" className="w-full border rounded px-2 py-1" required>
            <option value="">Seleccione supervisor</option>
            {voluntarios?.items?.map((v:any) => (
              <option key={v._id} value={v._id}>{v.nombre} {v.apellido}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Técnico (opcional)</label>
          <select name="ayudanteId" className="w-full border rounded px-2 py-1">
            <option value="">Sin técnico</option>
            {voluntarios?.items?.map((v:any) => (
              <option key={v._id} value={v._id}>{v.nombre} {v.apellido}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Fecha asignada</label>
          <input type="date" name="asignadoFecha" className="w-full border rounded px-2 py-1" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Fecha completado</label>
          <input type="date" name="completadoFecha" className="w-full border rounded px-2 py-1" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Notas</label>
          <textarea name="notas" className="w-full border rounded px-2 py-1 min-h-[100px]" />
        </div>
        <div className="md:col-span-2 flex justify-end gap-2">
          <button type="submit" className="bg-foreground text-background rounded px-3 py-1" disabled={saving}>{saving?"Guardando...":"Guardar"}</button>
        </div>
      </form>

      <div className="border rounded">
        <div className="px-3 py-2 border-b font-medium bg-neutral-50">Asignaciones</div>
        <ul className="divide-y">
          {lista?.items?.map((p) => (
            <li key={p._id} className="px-3 py-2 text-sm">
              <div className="font-medium">{p.fichaId?.titulo || "(sin ficha)"}</div>
              <div className="text-neutral-600">
                {p.voluntarioId ? `${p.voluntarioId?.nombre} ${p.voluntarioId?.apellido}` : "(sin supervisor)"}
                {p.ayudanteId ? ` · Técnico: ${p.ayudanteId?.nombre} ${p.ayudanteId?.apellido}` : ""}
              </div>
              <div className="text-neutral-500">
                Asignado: {new Date(p.asignadoFecha).toLocaleDateString()}
                {p.completadoFecha ? ` · Completado: ${new Date(p.completadoFecha).toLocaleDateString()}` : ""}
              </div>
              {p.notas ? (<div className="text-neutral-600 whitespace-pre-wrap mt-1">{p.notas}</div>) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
