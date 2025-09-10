"use client";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useState } from "react";

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

type Project = {
  _id: string;
  titulo: string;
  descripcion?: string;
  estado: string;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  voluntarioId?: string | null;
  ayudanteId?: string | null;
  checklist?: Array<{ text: string; done: boolean }>; // legacy
  checklistCategories?: Array<{
    _id: string;
    title: string;
    items: Array<{ text: string; done: boolean }>;
    isCollapsed: boolean;
    order: number;
  }>;
  evidencias?: Array<{ mediaId: string; thumbId?: string; titulo?: string; puntos: string[] }>;
  bitacora?: Array<{
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
  }>;
  presupuesto?: {
    materiales?: number;
    manoDeObra?: number;
    direccionTecnica?: number;
    indirectos?: number;
    itbis?: number;
    total?: number;
  };
};

type Volunteer = { 
  _id?: string; 
  id?: string; 
  nombre: string; 
  apellido: string;
};

export default function ProjectOverviewPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const { data: project, mutate } = useSWR<Project>(
    projectId ? `/api/proyectos/${projectId}` : null,
    fetcher
  );

  const { data: voluntariosResp } = useSWR<any>("/api/voluntarios", fetcher);

  const voluntarios = Array.isArray(voluntariosResp) 
    ? voluntariosResp as Volunteer[]
    : (voluntariosResp?.items || []) as Volunteer[];

  const volMap = new Map<string, string>();
  voluntarios.forEach((v: any) => {
    const id = (v?._id || v?.id) as string | undefined;
    if (id) volMap.set(id, `${v.nombre} ${v.apellido}`.trim());
  });

  function fmtDate(d?: string | null) {
    if (!d) return "—";
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString("es-ES", { 
        day: "2-digit", 
        month: "short", 
        year: "numeric" 
      }).replace(/\.$/, "");
    } catch {
      return String(d);
    }
  }

  function countDone(p?: Project) {
    if (!p) return 0;
    
    // Contar desde categorías si existen
    if (p.checklistCategories && p.checklistCategories.length > 0) {
      return p.checklistCategories.reduce((total, category) => 
        total + category.items.filter(item => item.done).length, 0
      );
    }
    
    // Fallback a checklist legacy
    if (!p.checklist) return 0;
    return p.checklist.filter(item => item?.done).length;
  }

  function countTotal(p?: Project) {
    if (!p) return 0;
    
    // Contar desde categorías si existen
    if (p.checklistCategories && p.checklistCategories.length > 0) {
      return p.checklistCategories.reduce((total, category) => 
        total + category.items.length, 0
      );
    }
    
    // Fallback a checklist legacy
    if (!p.checklist) return 0;
    return p.checklist.length;
  }

  function formatCurrency(value: number | undefined | null): string {
    if (!value && value !== 0) return "—";
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2
    }).format(value);
  }

  function calcularTotalPresupuesto(presupuesto: any): number {
    const materiales = presupuesto?.materiales || 0;
    const manoDeObra = presupuesto?.manoDeObra || 0;
    const direccionTecnica = presupuesto?.direccionTecnica || 0;
    const indirectos = presupuesto?.indirectos || 0;
    const itbis = presupuesto?.itbis || 0;
    return materiales + manoDeObra + direccionTecnica + indirectos + itbis;
  }

  function getProgressPercent(p?: Project) {
    const total = countTotal(p);
    const done = countDone(p);
    if (total > 0) return Math.round((done / total) * 100);
    
    // Fallback por estado
    if (p?.estado === "COMPLETADO") return 100;
    if (p?.estado === "EN_PROGRESO") return 25;
    return 0;
  }

  function isLate(p?: Project) {
    if (!p?.fechaFin || p?.estado === "COMPLETADO") return false;
    try { 
      return new Date(p.fechaFin) < new Date(); 
    } catch { 
      return false; 
    }
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-lg font-medium">Cargando proyecto...</div>
          <div className="text-sm text-[color:var(--muted)] mt-1">
            Obteniendo información del proyecto
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = getProgressPercent(project);

  return (
    <div className="space-y-6">
      {/* Información básica del proyecto */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Descripción */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Descripción</h2>
            {project.descripcion ? (
              <p className="text-sm text-[color:var(--muted)] leading-relaxed">
                {project.descripcion}
              </p>
            ) : (
              <p className="text-sm text-[color:var(--muted)] italic">
                Sin descripción disponible
              </p>
            )}
          </div>
        </div>

        {/* Progreso */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Progreso</h2>
          <div className="space-y-4">
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-3">
                <div
                  className="w-24 h-24 rounded-full"
                  style={{ 
                    background: `conic-gradient(#16a34a ${progressPercent * 3.6}deg, #e5e7eb 0deg)` 
                  }}
                />
                <div className="absolute inset-0 grid place-items-center text-lg font-bold text-neutral-800">
                  {progressPercent}%
                </div>
              </div>
              <div className="text-sm text-[color:var(--muted)]">
                {countDone(project)} de {countTotal(project)} completado
              </div>
            </div>
            
            {isLate(project) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-800">
                  <span>⚠️</span>
                  <span className="text-sm font-medium">Proyecto con retraso</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Información detallada */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fechas */}
        <div className="card p-4">
          <div className="text-sm font-medium text-[color:var(--muted)] mb-2">
            Fecha de inicio
          </div>
          <div className="text-lg">
            {fmtDate(project.fechaInicio)}
          </div>
        </div>

        <div className="card p-4">
          <div className="text-sm font-medium text-[color:var(--muted)] mb-2">
            Fecha de finalización
          </div>
          <div className="text-lg">
            {fmtDate(project.fechaFin)}
          </div>
        </div>

        {/* Asignaciones */}
        <div className="card p-4">
          <div className="text-sm font-medium text-[color:var(--muted)] mb-2">
            Supervisor asignado
          </div>
          <div className="text-lg">
            {project.voluntarioId 
              ? volMap.get(project.voluntarioId) || "Asignado"
              : "Sin asignar"
            }
          </div>
        </div>

        <div className="card p-4">
          <div className="text-sm font-medium text-[color:var(--muted)] mb-2">
            Técnico asignado
          </div>
          <div className="text-lg">
            {project.ayudanteId 
              ? volMap.get(project.ayudanteId) || "Asignado"
              : "Sin asignar"
            }
          </div>
        </div>
      </div>

      {/* Presupuesto aprobado */}
      {project.presupuesto && Object.values(project.presupuesto).some(v => v && v > 0) && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Presupuesto aprobado</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xs text-blue-600 font-medium mb-1">Materiales</div>
              <div className="text-sm font-bold text-blue-800">
                {formatCurrency(project.presupuesto.materiales)}
              </div>
            </div>
            
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xs text-green-600 font-medium mb-1">Mano de obra</div>
              <div className="text-sm font-bold text-green-800">
                {formatCurrency(project.presupuesto.manoDeObra)}
              </div>
            </div>
            
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xs text-purple-600 font-medium mb-1">Dirección técnica</div>
              <div className="text-sm font-bold text-purple-800">
                {formatCurrency(project.presupuesto.direccionTecnica)}
              </div>
            </div>
            
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-xs text-orange-600 font-medium mb-1">Indirectos</div>
              <div className="text-sm font-bold text-orange-800">
                {formatCurrency(project.presupuesto.indirectos)}
              </div>
            </div>
            
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-xs text-red-600 font-medium mb-1">ITBIS</div>
              <div className="text-sm font-bold text-red-800">
                {formatCurrency(project.presupuesto.itbis)}
              </div>
            </div>
            
            <div className="text-center p-3 bg-gray-100 rounded-lg border-2 border-gray-300">
              <div className="text-xs text-gray-700 font-semibold mb-1">TOTAL</div>
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(project.presupuesto.total || calcularTotalPresupuesto(project.presupuesto))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resumen de evidencias y checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumen de evidencias */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Evidencias</h2>
            <span className="text-sm text-[color:var(--muted)]">
              {project.evidencias?.length || 0} fotos
            </span>
          </div>
          
          {project.evidencias && project.evidencias.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {project.evidencias.slice(0, 6).map((ev, idx) => (
                <div key={idx} className="aspect-square">
                  <img 
                    src={`/api/images/${ev.thumbId || ev.mediaId}?thumb=1`}
                    alt={ev.titulo || `Evidencia ${idx + 1}`}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
              ))}
              {project.evidencias.length > 6 && (
                <div className="aspect-square bg-gray-100 rounded flex items-center justify-center text-sm text-[color:var(--muted)]">
                  +{project.evidencias.length - 6}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-[color:var(--muted)]">
              <span className="text-3xl">📸</span>
              <div className="text-sm mt-2">Sin evidencias aún</div>
            </div>
          )}
        </div>

        {/* Resumen de checklist */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Lista de verificación</h2>
            <span className="text-sm text-[color:var(--muted)]">
              {countDone(project)}/{countTotal(project)} completado
            </span>
          </div>
          
          {/* Mostrar categorías si existen */}
          {project.checklistCategories && project.checklistCategories.length > 0 ? (
            <div className="space-y-3">
              {project.checklistCategories.slice(0, 3).map((category) => {
                const categoryDone = category.items.filter(item => item.done).length;
                const categoryTotal = category.items.length;
                const categoryProgress = categoryTotal > 0 ? Math.round((categoryDone / categoryTotal) * 100) : 0;
                
                return (
                  <div key={category._id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{category.title}</h4>
                      <span className="text-xs text-[color:var(--muted)]">
                        {categoryDone}/{categoryTotal}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${categoryProgress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {project.checklistCategories.length > 3 && (
                <div className="text-sm text-[color:var(--muted)] pt-2">
                  ... y {project.checklistCategories.length - 3} categorías más
                </div>
              )}
            </div>
          ) : project.checklist && project.checklist.length > 0 ? (
            // Fallback a checklist legacy
            <div className="space-y-2">
              {project.checklist.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <input 
                    type="checkbox" 
                    checked={!!item.done} 
                    disabled 
                    className="cursor-not-allowed"
                  />
                  <span className={item.done ? "line-through opacity-70" : ""}>
                    {item.text}
                  </span>
                </div>
              ))}
              {project.checklist.length > 5 && (
                <div className="text-sm text-[color:var(--muted)] pt-2">
                  ... y {project.checklist.length - 5} elementos más
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-[color:var(--muted)]">
              <span className="text-3xl">✅</span>
              <div className="text-sm mt-2">Sin elementos en la lista</div>
            </div>
          )}
        </div>
      </div>

      {/* Bitácora reciente */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Bitácora reciente</h2>
          <span className="text-sm text-[color:var(--muted)]">
            {project.bitacora?.length || 0} entradas
          </span>
        </div>
        
        {project.bitacora && project.bitacora.length > 0 ? (
          <div className="space-y-4">
            {project.bitacora
              .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
              .slice(0, 3)
              .map((entry) => (
              <div key={entry._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-sm">
                      {new Date(entry.fecha).toLocaleDateString('es-ES', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="text-xs text-[color:var(--muted)]">
                      Por {entry.createdBy}
                    </div>
                  </div>
                  {entry.fotos && entry.fotos.length > 0 && (
                    <div className="flex gap-1">
                      {entry.fotos.slice(0, 2).map((foto, idx) => (
                        <img
                          key={idx}
                          src={`/api/images/${foto.thumbId || foto.mediaId}?thumb=1`}
                          alt={foto.titulo || `Foto ${idx + 1}`}
                          className="w-8 h-8 object-cover rounded"
                        />
                      ))}
                      {entry.fotos.length > 2 && (
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-xs text-[color:var(--muted)]">
                          +{entry.fotos.length - 2}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">
                  {entry.notas}
                </p>
              </div>
            ))}
            {project.bitacora.length > 3 && (
              <div className="text-sm text-[color:var(--muted)] text-center pt-2">
                ... y {project.bitacora.length - 3} entradas más en bitácora
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-[color:var(--muted)]">
            <span className="text-3xl">📝</span>
            <div className="text-sm mt-2">Sin entradas en bitácora</div>
          </div>
        )}
      </div>
    </div>
  );
}
