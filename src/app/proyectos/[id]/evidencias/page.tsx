"use client";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useState, useRef } from "react";

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

type Evidencia = { 
  mediaId: string; 
  thumbId?: string; 
  titulo?: string; 
  puntos: string[] 
};

type Project = {
  _id: string;
  titulo: string;
  evidencias?: Evidencia[];
};

export default function ProjectEvidenciasPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const { data: project, mutate } = useSWR<Project>(
    projectId ? `/api/proyectos/${projectId}` : null,
    fetcher
  );

  const [newEvidencias, setNewEvidencias] = useState<Array<{
    mediaId: string;
    thumbId?: string;
    titulo?: string;
    puntos: string[];
    thumbUrl: string;
  }>>([]);

  const [selectedEvidencia, setSelectedEvidencia] = useState<Evidencia | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onUploadChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      
      try {
        const res = await fetch("/api/uploads", { method: "POST", body: form });
        if (!res.ok) continue;
        
        const json = await res.json();
        const thumbUrl = `/api/images/${json.thumbId}?thumb=1`;
        
        setNewEvidencias(prev => [...prev, {
          mediaId: json.id,
          thumbId: json.thumbId,
          titulo: file.name,
          puntos: [],
          thumbUrl
        }]);
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    }
    
    e.currentTarget.value = "";
  }

  function actualizarTitulo(idx: number, titulo: string) {
    setNewEvidencias(prev => prev.map((ev, i) => 
      i === idx ? { ...ev, titulo } : ev
    ));
  }

  function actualizarPuntos(idx: number, text: string) {
    const puntos = text.split(/\r?\n|,|;/).map(s => s.trim()).filter(Boolean);
    setNewEvidencias(prev => prev.map((ev, i) => 
      i === idx ? { ...ev, puntos } : ev
    ));
  }

  function quitarEvidencia(idx: number) {
    setNewEvidencias(prev => prev.filter((_, i) => i !== idx));
  }

  async function guardarNuevasEvidencias() {
    if (newEvidencias.length === 0) return;
    
    try {
      const addEvidencias = newEvidencias.map(ev => ({
        mediaId: ev.mediaId,
        thumbId: ev.thumbId,
        titulo: ev.titulo,
        puntos: ev.puntos
      }));

      const res = await fetch(`/api/proyectos/${projectId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ addEvidencias })
      });

      if (!res.ok) throw new Error(await res.text());

      setNewEvidencias([]);
      await mutate();
      
    } catch (error: any) {
      alert(`Error al guardar evidencias: ${error?.message || error}`);
    }
  }

  async function eliminarEvidencia(mediaId: string) {
    if (!confirm("¿Eliminar esta evidencia?")) return;
    
    try {
      const res = await fetch(`/api/proyectos/${projectId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ removeEvidenciaIds: [mediaId] })
      });

      if (!res.ok) throw new Error(await res.text());
      
      await mutate();
      
    } catch (error: any) {
      alert(`Error al eliminar evidencia: ${error?.message || error}`);
    }
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-lg font-medium">Cargando evidencias...</div>
        </div>
      </div>
    );
  }

  const evidenciasExistentes = project.evidencias || [];

  return (
    <div className="space-y-6">
      {/* Header con botón de agregar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Evidencias del proyecto</h1>
          <p className="text-sm text-[color:var(--muted)] mt-1">
            {evidenciasExistentes.length} evidencias guardadas
          </p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="btn btn-primary"
        >
          📸 Agregar fotos
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onUploadChange}
        className="hidden"
      />

      {/* Nuevas evidencias por guardar */}
      {newEvidencias.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Nuevas evidencias</h2>
            <button
              onClick={guardarNuevasEvidencias}
              className="btn btn-primary"
            >
              Guardar {newEvidencias.length} evidencia{newEvidencias.length !== 1 ? 's' : ''}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {newEvidencias.map((ev, idx) => (
              <div key={idx} className="border border-[color:var(--border)] rounded-lg p-4 space-y-3">
                <img
                  src={ev.thumbUrl}
                  alt={ev.titulo || "Nueva evidencia"}
                  className="w-full h-48 object-cover rounded"
                />
                
                <input
                  value={ev.titulo || ""}
                  onChange={(e) => actualizarTitulo(idx, e.target.value)}
                  className="w-full input"
                  placeholder="Título de la foto"
                />
                
                <textarea
                  onChange={(e) => actualizarPuntos(idx, e.target.value)}
                  className="w-full textarea min-h-[80px]"
                  placeholder="Puntos a tratar (uno por línea)"
                />
                
                <button
                  type="button"
                  className="btn btn-ghost text-red-600"
                  onClick={() => quitarEvidencia(idx)}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidencias existentes */}
      {evidenciasExistentes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {evidenciasExistentes.map((ev, idx) => (
            <div key={idx} className="card p-4 space-y-3">
              <div className="relative group">
                <img
                  src={`/api/images/${ev.thumbId || ev.mediaId}?thumb=1`}
                  alt={ev.titulo || `Evidencia ${idx + 1}`}
                  className="w-full h-48 object-cover rounded cursor-pointer"
                  onClick={() => setSelectedEvidencia(ev)}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded flex items-center justify-center">
                  <button
                    onClick={() => setSelectedEvidencia(ev)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-black px-3 py-1 rounded text-sm"
                  >
                    Ver grande
                  </button>
                </div>
              </div>
              
              {ev.titulo && (
                <h3 className="font-medium text-sm">{ev.titulo}</h3>
              )}
              
              {ev.puntos && ev.puntos.length > 0 && (
                <div>
                  <div className="text-xs text-[color:var(--muted)] mb-1">
                    Puntos tratados:
                  </div>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {ev.puntos.map((punto, i) => (
                      <li key={i} className="text-[color:var(--muted)]">
                        {punto}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                <a
                  href={`/api/images/${ev.mediaId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost text-sm flex-1"
                >
                  Descargar
                </a>
                <button
                  onClick={() => eliminarEvidencia(ev.mediaId)}
                  className="btn btn-ghost text-red-600 text-sm"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12">
          <div className="text-center">
            <div className="text-6xl mb-4">📸</div>
            <h2 className="text-xl font-semibold mb-2">Sin evidencias aún</h2>
            <p className="text-[color:var(--muted)] mb-6">
              Agrega fotos para documentar el progreso del proyecto
            </p>
            <button
              onClick={() => fileRef.current?.click()}
              className="btn btn-primary"
            >
              Agregar primera evidencia
            </button>
          </div>
        </div>
      )}

      {/* Modal para ver evidencia en grande */}
      {selectedEvidencia && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="max-w-4xl max-h-[90vh] w-full">
            <div className="bg-white rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">
                  {selectedEvidencia.titulo || "Evidencia"}
                </h3>
                <button
                  onClick={() => setSelectedEvidencia(null)}
                  className="btn btn-ghost"
                >
                  Cerrar
                </button>
              </div>
              
              <div className="p-4">
                <img
                  src={`/api/images/${selectedEvidencia.mediaId}`}
                  alt={selectedEvidencia.titulo || "Evidencia"}
                  className="w-full max-h-[60vh] object-contain"
                />
                
                {selectedEvidencia.puntos && selectedEvidencia.puntos.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Puntos tratados:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedEvidencia.puntos.map((punto, i) => (
                        <li key={i}>{punto}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
