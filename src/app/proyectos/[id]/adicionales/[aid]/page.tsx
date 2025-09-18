"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AdicionalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;
  const aid = params?.aid as string;

  const [item, setItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cost, setCost] = useState("");
  const [fecha, setFecha] = useState("");
  const [responsableId, setResponsableId] = useState("");
  const [solicitadoPor, setSolicitadoPor] = useState("");
  const [status, setStatus] = useState("");
  const [responsables, setResponsables] = useState<any[]>([]);

  useEffect(() => {
    if (!projectId || !aid) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/projects/${projectId}/adicionales`).then(r => r.ok ? r.json() : []),
      fetch('/api/voluntarios').then(r=>r.ok? r.json(): [])
    ])
    .then(([adList, vols]) => {
      const found = Array.isArray(adList) ? adList.find((a: any) => String(a._id||a.id) === String(aid)) : null;
      setItem(found || null);
      if (found) {
        setTitulo(found.title || '');
        setDescripcion(found.description || '');
        setCost(found.cost ? String(found.cost) : '');
        setFecha(found.fecha ? new Date(found.fecha).toISOString().slice(0,10) : '');
        setResponsableId(found.responsableId || '');
        setSolicitadoPor(found.solicitadoPor || '');
        setStatus(found.status || 'PENDIENTE');
      }
      setResponsables(Array.isArray(vols) ? vols : (vols?.items||[]));
    })
    .catch(()=>{})
    .finally(()=>setLoading(false));
  }, [projectId, aid]);

  async function save() {
    try {
      const payload = { title: titulo, description: descripcion || undefined, cost: cost ? Number(cost) : 0, fecha: fecha || undefined, responsableId: responsableId || undefined, solicitadoPor: solicitadoPor || undefined, status };
      const res = await fetch(`/api/projects/${projectId}/adicionales/${aid}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      router.back();
    } catch (e: any) {
      alert('Error guardando: '+(e?.message||e));
    }
  }

  async function remove() {
    if (!confirm('Eliminar adicional?')) return;
    await fetch(`/api/projects/${projectId}/adicionales/${aid}`, { method: 'DELETE' });
    router.back();
  }

  if (loading) return <div className="text-sm text-[color:var(--muted)]">Cargando...</div>;
  if (!item) return <div className="text-sm text-[color:var(--muted)]">Adicional no encontrado</div>;

  return (
    <div className="card p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Editar adicional</h3>
        <div>
          <button className="btn btn-ghost" onClick={() => router.back()}>Cerrar</button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Título</label>
          <input className="w-full input" value={titulo} onChange={(e)=>setTitulo(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Solicitado por</label>
          <input className="w-full input" value={solicitadoPor} onChange={(e)=>setSolicitadoPor(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Descripción</label>
          <textarea className="w-full textarea" value={descripcion} onChange={(e)=>setDescripcion(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">Costo</label>
            <input className="w-full input" value={cost} onChange={(e)=>setCost(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Fecha</label>
            <input type="date" className="w-full input" value={fecha} onChange={(e)=>setFecha(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Responsable</label>
            <select className="w-full select" value={responsableId} onChange={(e)=>setResponsableId(e.target.value)}>
              <option value="">Sin asignar</option>
              {responsables.map(r => <option key={r._id||r.id} value={r._id||r.id}>{r.nombre} {r.apellido || ''}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Estado</label>
          <select className="w-48 select" value={status} onChange={(e)=>setStatus(e.target.value)}>
            <option value="PENDIENTE">PENDIENTE</option>
            <option value="APROBADO">APROBADO</option>
            <option value="DESCARTADO">DESCARTADO</option>
          </select>
        </div>

        <div className="flex gap-2 justify-end">
          <button className="btn btn-ghost" onClick={()=>router.back()}>Cancelar</button>
          <button className="btn btn-danger" onClick={remove}>Eliminar</button>
          <button className="btn btn-primary" onClick={save}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
