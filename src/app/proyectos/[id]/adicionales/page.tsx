"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";

export default function AdicionalesPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cost, setCost] = useState<string>("");
  const [responsables, setResponsables] = useState<any[]>([]);
  const [fecha, setFecha] = useState<string>("");
  const [responsableId, setResponsableId] = useState<string>("");
  const [solicitadoPor, setSolicitadoPor] = useState<string>("");

  // New: fotos support for the modal
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [fotosForNew, setFotosForNew] = useState<Array<{ mediaId: string; thumbId?: string; titulo?: string; thumbUrl?: string }>>([]);
  const [uploadingFotos, setUploadingFotos] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetch(`/api/projects/overview/${projectId}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((data) => {
        setItems(Array.isArray(data.adicionales) ? data.adicionales : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    // fetch responsables volunteers list
    fetch('/api/voluntarios')
      .then(r => r.ok ? r.json() : [])
      .then(data => setResponsables(Array.isArray(data) ? data : (data?.items||[])))
      .catch(()=>setResponsables([]));
  }, []);

  async function uploadFotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingFotos(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/uploads', { method: 'POST', body: form });
        if (!res.ok) continue;
        const json = await res.json();
        const thumbUrl = `/api/images/${json.thumbId}?thumb=1`;
        setFotosForNew(prev => [...prev, { mediaId: json.id, thumbId: json.thumbId, titulo: file.name, thumbUrl }]);
      }
    } catch (e) {
      console.warn('Foto upload error', e);
    } finally {
      setUploadingFotos(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function onFotosInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    uploadFotos(files);
  }

  function removeFotoLocal(idx: number) {
    setFotosForNew(prev => prev.filter((_, i) => i !== idx));
  }

  function openEdit(item: any) {
    setEditingId(String(item._id || item.id));
    setTitulo(item.title || "");
    setDescripcion(item.description || "");
    setCost(item.cost != null ? String(item.cost) : "");
    setFecha(item.fecha ? new Date(item.fecha).toISOString().slice(0, 10) : "");
    setResponsableId(item.responsableId || "");
    setSolicitadoPor(item.createdBy || "");
    setFotosForNew(Array.isArray(item.fotos) ? item.fotos.map((f: any) => ({ mediaId: f.mediaId, thumbId: f.thumbId, titulo: f.titulo, thumbUrl: `/api/images/${f.thumbId || f.mediaId}?thumb=1` })) : []);
    setOpen(true);
  }

  async function crearAdicional(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return alert("Título requerido");
    const payload: any = { title: titulo.trim(), description: descripcion.trim() || undefined, cost: Number(cost) || 0, fecha: fecha || undefined, responsableId: responsableId || undefined };
    if (solicitadoPor) payload.actor = solicitadoPor;
    if (fotosForNew.length) payload.fotos = fotosForNew.map(f => ({ mediaId: f.mediaId, thumbId: f.thumbId, titulo: f.titulo }));
    try {
      const res = await fetch(`/api/projects/${projectId}/adicionales`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      const body = await res.json();
      setItems((s)=>[...(s||[]), body]);
      setTitulo(""); setDescripcion(""); setCost(""); setOpen(false); setFotosForNew([]); setFecha(''); setResponsableId('');
      setSolicitadoPor('');
    } catch (err: any) {
      alert(`Error: ${err?.message || err}`);
    }
  }

  async function saveEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    if (!titulo.trim()) return alert("Título requerido");
    const payload: any = { title: titulo.trim(), description: descripcion.trim() || undefined, cost: Number(cost) || 0, fecha: fecha || undefined, responsableId: responsableId || undefined };
    if (solicitadoPor) payload.actor = solicitadoPor;
    if (fotosForNew.length) payload.fotos = fotosForNew.map(f => ({ mediaId: f.mediaId, thumbId: f.thumbId, titulo: f.titulo }));
    try {
      const res = await fetch(`/api/projects/${projectId}/adicionales/${editingId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      // refresh list
      const updated = await fetch(`/api/projects/${projectId}/adicionales`).then(r=>r.ok? r.json(): []);
      setItems(Array.isArray(updated) ? updated : []);
      // reset
      setEditingId(null);
      setTitulo(''); setDescripcion(''); setCost(''); setFecha(''); setResponsableId(''); setFotosForNew([]);
      setSolicitadoPor('');
      setOpen(false);
    } catch (e: any) {
      alert('Error guardando edición: '+(e?.message||e));
    }
  }

  async function remove(id: string) {
    if (!confirm("Eliminar adicional?")) return;
    await fetch(`/api/projects/${projectId}/adicionales/${id}`, { method: "DELETE" });
    setItems((s)=>s.filter(it=>String(it._id||it.id)!==String(id)));
  }

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/adicionales/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error(await res.text());
      // refresh list
      const updated = await fetch(`/api/projects/${projectId}/adicionales`).then(r=>r.ok? r.json(): []);
      setItems(Array.isArray(updated) ? updated : []);
    } catch (e: any) {
      alert('Error actualizando estado: '+(e?.message||e));
    }
  }

  async function setFechaResponsable(id: string, fecha: string, responsableId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/adicionales/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fecha, responsableId }) });
      if (!res.ok) throw new Error(await res.text());
      const updated = await fetch(`/api/projects/${projectId}/adicionales`).then(r=>r.ok? r.json(): []);
      setItems(Array.isArray(updated) ? updated : []);
    } catch (e: any) {
      alert('Error actualizando: '+(e?.message||e));
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Adicionales</h2>
        <div>
          <button className="btn" onClick={()=>setOpen(true)}>Nuevo adicional</button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-[color:var(--muted)]">Cargando...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-[color:var(--muted)]">No hay adicionales.</div>
      ) : (
        // Render as a list
        <ol className="list-decimal pl-5 space-y-3">
          {items.map((it, idx)=> (
            <li key={it._id||it.id} className="border rounded p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium">{it.title}</div>
                  {it.description && <div className="text-sm text-[color:var(--muted)]">{it.description}</div>}
                  <div className="text-sm mt-1">Costo: {typeof it.cost === 'number' ? it.cost.toLocaleString() : it.cost}</div>
                  <div className="text-sm mt-1">Fecha: {it.fecha ? new Date(it.fecha).toLocaleDateString() : '—'}</div>
                  <div className="text-sm mt-1">Responsable: {it.responsableId ? it.responsableId : '—'}</div>
                  {it.fotos && it.fotos.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {it.fotos.map((f: any) => (
                        <img key={f.mediaId || f._id} src={`/api/images/${f.thumbId || f.mediaId}?thumb=1`} alt={f.titulo || ''} className="w-16 h-12 object-cover rounded" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-sm">Estado: <strong>{it.status}</strong></div>
                  <div className="flex gap-2">
                    {it.status !== 'APROBADO' && <button className="btn btn-success" onClick={()=>updateStatus(it._id||it.id, 'APROBADO')}>Aprobar</button>}
                    {it.status !== 'DESCARTADO' && <button className="btn btn-ghost" onClick={()=>updateStatus(it._id||it.id, 'DESCARTADO')}>Descartar</button>}
                    <button className="btn btn-ghost" onClick={()=>openEdit(it)}>Editar</button>
                    <button className="btn btn-ghost" onClick={()=>remove(it._id||it.id)}>Eliminar</button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={()=>{ setOpen(false); setEditingId(null); setFotosForNew([]); }} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="card w-[95vw] max-w-2xl">
              <div className="px-4 py-3 card-header flex items-center gap-2">
                <div className="font-semibold">{editingId ? 'Editar adicional' : 'Nuevo adicional'}</div>
                <button className="ml-auto btn btn-ghost" title="Cerrar" onClick={()=>{ setOpen(false); setEditingId(null); setFotosForNew([]); }}>Cerrar</button>
              </div>
              <form className="p-4 space-y-3" onSubmit={editingId ? saveEdicion : crearAdicional}>
                <div>
                  <input className="w-full input" placeholder="Título" value={titulo} onChange={(e)=>setTitulo(e.target.value)} required />
                </div>
                <div>
                  <textarea className="w-full input" placeholder="Descripción" value={descripcion} onChange={(e)=>setDescripcion(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Solicitado por</label>
                  <input
                    className="w-full input"
                    placeholder="Nombre o email de quien solicita"
                    value={solicitadoPor}
                    onChange={(e)=>setSolicitadoPor(e.target.value)}
                    title="Solicitado por"
                    aria-label="Solicitado por"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm mb-1">Fecha (opcional)</label>
                    <input type="date" title="Fecha del adicional" aria-label="Fecha del adicional" className="w-full input" value={fecha} onChange={(e)=>setFecha(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Responsable (opcional)</label>
                    <select title="Responsable del adicional" aria-label="Responsable del adicional" className="w-full select" value={responsableId} onChange={(e)=>setResponsableId(e.target.value)}>
                      <option value="">Sin asignar</option>
                      {responsables.map(r => (
                        <option key={r._id||r.id} value={r._id||r.id}>{r.nombre} {r.apellido || ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <input className="w-full input" placeholder="Costo (número)" value={cost} onChange={(e)=>setCost(e.target.value)} />
                </div>

                {/* Foto upload controls */}
                <div>
                  <input ref={fileRef} type="file" accept="image/*" multiple onChange={onFotosInputChange} className="hidden" aria-hidden="true" />
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>📷 Agregar fotos</button>
                    {uploadingFotos && <div className="text-sm text-[color:var(--muted)]">Subiendo...</div>}
                  </div>

                  {fotosForNew.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {fotosForNew.map((f, i) => (
                        <div key={f.mediaId} className="border rounded p-2 relative">
                          <img src={f.thumbUrl} alt={f.titulo || ''} className="w-full h-20 object-cover rounded" />
                          <input className="w-full input mt-2 text-sm" placeholder="Título foto" value={f.titulo} onChange={(e)=>{ const v = e.target.value; setFotosForNew(prev => prev.map((x, idx) => idx===i? {...x, titulo: v} : x)); }} />
                          <button type="button" className="btn btn-ghost absolute top-1 right-1" onClick={()=>removeFotoLocal(i)}>✖</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button className="btn btn-primary" type="submit">{editingId ? 'Guardar' : 'Crear'}</button>
                  <button type="button" className="btn btn-ghost" onClick={()=>{ setOpen(false); setEditingId(null); setFotosForNew([]); }}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
