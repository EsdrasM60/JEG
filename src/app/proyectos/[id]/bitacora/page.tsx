"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

type BitacoraEntry = {
  _id: string;
  fecha: string;
  notas: string;
  fotos: Array<{
    mediaId: string;
    thumbId?: string;
    titulo?: string;
    enEvidencia: boolean;
  }>;
  createdBy: string;
  createdAt: string;
};

type Project = {
  _id: string;
  titulo: string;
  bitacora?: BitacoraEntry[];
};

export default function ProjectBitacoraPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const { data: project, mutate } = useSWR<Project>(
    projectId ? `/api/proyectos/${projectId}` : null,
    fetcher
  );

  const { data: session } = useSession();

  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    fecha: new Date().toISOString().split('T')[0],
    notas: "",
    fotos: [] as File[],
    fotoTitulos: [] as string[],
    guardarEnEvidencia: [] as boolean[]
  });
  const [uploading, setUploading] = useState(false);

  const bitacoraEntries = project?.bitacora || [];

  // Edit entry state: abrir modal al hacer click sobre una tarjeta
  const [editingEntry, setEditingEntry] = useState<BitacoraEntry | null>(null);
  const [showEditEntry, setShowEditEntry] = useState(false);
  const [editFecha, setEditFecha] = useState("");
  const [editNotas, setEditNotas] = useState("");

  // client-side image compression util (resize + convert to webp)
  const compressImage = useCallback(async (file: File, maxWidth = 1600, quality = 0.8): Promise<Blob> => {
    // createImageBitmap for efficient decoding
    const img = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/webp', quality);
    });
  }, []);

  // upload helper with compression and concurrency
  async function uploadFiles(files: File[]) {
    const uploadedFiles = [] as Array<any>;
    const MAX_COMPRESSED_BYTES = 5 * 1024 * 1024; // 5 MB per compressed file
    const concurrency = 3;

    async function uploadSingle(file: File, index: number) {
      // compress
      const compressed = await compressImage(file, 1600, 0.8);
      if (compressed.size > MAX_COMPRESSED_BYTES) {
        throw new Error(`Archivo ${file.name} demasiado grande tras compresión (${Math.round(compressed.size/1024)} KB)`);
      }
      const blobName = file.name.replace(/\.[^.]+$/, '') + '.webp';
      const formData = new FormData();
      formData.append('file', compressed, blobName);

      const uploadRes = await fetch('/api/uploads', { method: 'POST', body: formData });
      if (!uploadRes.ok) {
        const text = await uploadRes.text().catch(() => '');
        throw new Error(text || `Error subiendo archivo ${file.name}`);
      }
      const uploadData = await uploadRes.json();
      return {
        mediaId: uploadData.id,
        thumbId: uploadData.thumbId,
        titulo: newEntry.fotoTitulos[index] || file.name,
        enEvidencia: newEntry.guardarEnEvidencia[index] || false
      };
    }

    const queue = files.map((f, i) => ({ f, i }));
    const workers = new Array(concurrency).fill(null).map(async () => {
      while (queue.length) {
        const item = queue.shift();
        if (!item) break;
        const res = await uploadSingle(item.f, item.i);
        uploadedFiles.push(res);
      }
    });

    await Promise.all(workers);
    return uploadedFiles;
  }

  async function addBitacoraEntry() {
    if (!newEntry.notas.trim()) {
      alert("Por favor agrega notas para la entrada de bitácora");
      return;
    }

    setUploading(true);
    try {
      let uploadedFotos: Array<{
        mediaId: string;
        thumbId?: string;
        titulo?: string;
        enEvidencia: boolean;
      }> = [];
      
      if (newEntry.fotos.length > 0) {
        uploadedFotos = await uploadFiles(newEntry.fotos);
      }

      // Guardar la fecha como midday UTC para evitar desplazamientos de zona horaria
      const fechaStored = `${newEntry.fecha}T12:00:00Z`;
      const bitacoraEntry = {
        fecha: fechaStored,
        notas: newEntry.notas.trim(),
        fotos: uploadedFotos,
        createdBy: session?.user?.name || session?.user?.email || "current-user",
        createdAt: new Date().toISOString()
      };

      // Agregar entrada a bitácora
      const updateData: any = {
        bitacora: [...bitacoraEntries, bitacoraEntry]
      };

      // Si hay fotos que deben guardarse en evidencia, agregarlas también
      const fotosParaEvidencia = uploadedFotos.filter(foto => foto.enEvidencia);
      if (fotosParaEvidencia.length > 0) {
        updateData.addEvidencias = fotosParaEvidencia.map(foto => ({
          mediaId: foto.mediaId,
          thumbId: foto.thumbId,
          titulo: foto.titulo,
          puntos: [`Agregado desde bitácora - ${newEntry.fecha}`]
        }));
      }

      const res = await fetch(`/api/proyectos/${projectId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(updateData)
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      await mutate();
      
      // Limpiar formulario
      setNewEntry({
        fecha: new Date().toISOString().split('T')[0],
        notas: "",
        fotos: [],
        fotoTitulos: [],
        guardarEnEvidencia: []
      });
      setShowNewEntry(false);
      
      alert("Entrada de bitácora agregada exitosamente");
    } catch (error: any) {
      alert(`Error agregando entrada: ${error?.message || error}`);
    } finally {
      setUploading(false);
    }
  }

  function addFoto(file: File) {
    setNewEntry(prev => ({
      ...prev,
      fotos: [...prev.fotos, file],
      fotoTitulos: [...prev.fotoTitulos, ""],
      guardarEnEvidencia: [...prev.guardarEnEvidencia, false]
    }));
  }

  function removeFoto(index: number) {
    setNewEntry(prev => ({
      ...prev,
      fotos: prev.fotos.filter((_, i) => i !== index),
      fotoTitulos: prev.fotoTitulos.filter((_, i) => i !== index),
      guardarEnEvidencia: prev.guardarEnEvidencia.filter((_, i) => i !== index)
    }));
  }

  function updateFotoTitulo(index: number, titulo: string) {
    setNewEntry(prev => ({
      ...prev,
      fotoTitulos: prev.fotoTitulos.map((t, i) => i === index ? titulo : t)
    }));
  }

  function updateGuardarEnEvidencia(index: number, guardar: boolean) {
    setNewEntry(prev => ({
      ...prev,
      guardarEnEvidencia: prev.guardarEnEvidencia.map((g, i) => i === index ? guardar : g)
    }));
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-lg font-medium">Cargando bitácora...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Bitácora del proyecto</h1>
          <p className="text-sm text-[color:var(--muted)] mt-1">
            Registro diario de actividades y observaciones
          </p>
        </div>
        
        <button 
          onClick={() => setShowNewEntry(true)}
          className="btn btn-primary"
        >
          ➕ Nueva entrada
        </button>
      </div>

      {/* Entradas de bitácora */}
      <div className="space-y-4">
        {bitacoraEntries
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
          .map((entry) => (
          <div key={entry._id} className="card p-6 cursor-pointer" onClick={() => {
            setEditingEntry(entry);
            setEditFecha(new Date(entry.fecha).toISOString().split('T')[0]);
            setEditNotas(entry.notas || "");
            setShowEditEntry(true);
          }}>
             <div className="flex items-start justify-between mb-4">
               <div>
                 <h3 className="text-lg font-semibold">{formatDate(entry.fecha)}</h3>
                 <p className="text-sm text-[color:var(--muted)]">
                   Por {entry.createdBy} • {new Date(entry.createdAt).toLocaleString('es-ES')}
                 </p>
               </div>
             </div>
            
            <div className="mb-4">
              <p className="whitespace-pre-wrap">{entry.notas}</p>
            </div>
            
            {entry.fotos && entry.fotos.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Fotos ({entry.fotos.length})</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {entry.fotos.map((foto, idx) => (
                    <div key={idx} className="relative group" onClick={(e) => e.stopPropagation()}>
                      <img
                        src={foto.thumbId ? `/api/images/${foto.thumbId}?thumb=1` : `/api/images/${foto.mediaId}`}
                        alt={foto.titulo || `Foto ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <div className="text-white text-center text-sm p-2">
                          <div className="font-medium">{foto.titulo}</div>
                          {foto.enEvidencia && (
                            <div className="text-xs text-green-300 mt-1">
                              ✓ En evidencias
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
           </div>
         ))}
        
        {bitacoraEntries.length === 0 && (
          <div className="text-center py-12 text-[color:var(--muted)]">
            <span className="text-6xl">📝</span>
            <div className="text-lg mt-4">No hay entradas en la bitácora</div>
            <div className="text-sm mt-2">Agrega la primera entrada para comenzar el registro</div>
          </div>
        )}
      </div>

      {/* Modal para nueva entrada */}
      {showNewEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Nueva entrada de bitácora</h3>
              <p className="text-sm text-[color:var(--muted)] mt-1">
                Registra las actividades y observaciones del día
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Fecha */}
              <div>
                <label className="block text-sm font-medium mb-2">Fecha *</label>
                <input
                  type="date"
                  value={newEntry.fecha}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, fecha: e.target.value }))}
                  className="w-full input"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium mb-2">Notas y observaciones *</label>
                <textarea
                  value={newEntry.notas}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, notas: e.target.value }))}
                  className="w-full input h-32 resize-none"
                  placeholder="Describe las actividades realizadas, observaciones, problemas encontrados, etc..."
                />
              </div>

              {/* Fotos */}
              <div>
                <label className="block text-sm font-medium mb-2">Fotos</label>
                
                {newEntry.fotos.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {newEntry.fotos.map((file, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-20 h-20 object-cover rounded"
                          />
                          <div className="flex-1 space-y-2">
                            <label className="block text-xs text-neutral-600">Título (opcional)</label>
                            <input
                              type="text"
                              title={`Título de la foto ${index + 1}`}
                              value={newEntry.fotoTitulos[index]}
                              onChange={(e) => updateFotoTitulo(index, e.target.value)}
                              className="w-full input"
                              placeholder="Título de la foto (opcional)"
                            />
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                title={`Guardar foto ${index + 1} en evidencias`}
                                checked={newEntry.guardarEnEvidencia[index]}
                                onChange={(e) => updateGuardarEnEvidencia(index, e.target.checked)}
                                className="w-4 h-4"
                              />
                              <span className="text-sm">Guardar también en evidencias</span>
                            </label>
                          </div>
                          <button
                            onClick={() => removeFoto(index)}
                            className="text-red-600 hover:text-red-800"
                            aria-label={`Eliminar foto ${index + 1}`}
                            title={`Eliminar foto ${index + 1}`}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                     ))}
                   </div>
                 )}
                 
                <input
                  type="file"
                  title="Seleccionar fotos"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    files.forEach(file => addFoto(file));
                    e.target.value = "";
                  }}
                  className="w-full input"
                />
                <p className="text-xs text-[color:var(--muted)] mt-1">
                  Puedes seleccionar múltiples fotos. Formatos soportados: JPG, PNG, GIF
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowNewEntry(false);
                  setNewEntry({
                    fecha: new Date().toISOString().split('T')[0],
                    notas: "",
                    fotos: [],
                    fotoTitulos: [],
                    guardarEnEvidencia: []
                  });
                }}
                className="btn btn-ghost"
                disabled={uploading}
              >
                Cancelar
              </button>
              <button
                onClick={addBitacoraEntry}
                className="btn btn-primary"
                disabled={!newEntry.notas.trim() || uploading}
              >
                {uploading ? "Guardando..." : "Guardar entrada"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar entrada existente */}
      {showEditEntry && editingEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Editar entrada de bitácora</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Fecha *</label>
                <input
                  type="date"
                  value={editFecha}
                  onChange={(e) => setEditFecha(e.target.value)}
                  className="w-full input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Notas y observaciones *</label>
                <textarea
                  value={editNotas}
                  onChange={(e) => setEditNotas(e.target.value)}
                  className="w-full input h-32 resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t flex gap-3 justify-end">
              <button
                onClick={() => { setShowEditEntry(false); setEditingEntry(null); }}
                className="btn btn-ghost"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!editingEntry) return;
                  if (!editNotas.trim()) return alert('Notas vacías');
                  try {
                    const fechaStored = `${editFecha}T12:00:00Z`;
                    const updated = { ...editingEntry, fecha: fechaStored, notas: editNotas.trim() };
                    const updateData: any = { bitacora: bitacoraEntries.map(e => e._id === editingEntry._id ? updated : e) };
                    const res = await fetch(`/api/proyectos/${projectId}`, {
                      method: 'PATCH',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify(updateData)
                    });
                    if (!res.ok) throw new Error(await res.text());
                    await mutate();
                    setShowEditEntry(false);
                    setEditingEntry(null);
                    alert('Entrada actualizada');
                  } catch (err: any) {
                    alert(`Error actualizando: ${err?.message || err}`);
                  }
                }}
                className="btn btn-primary"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
