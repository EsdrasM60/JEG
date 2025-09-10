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
  voluntarioId?: string | null;
  ayudanteId?: string | null;
};

type Volunteer = { 
  _id?: string; 
  id?: string; 
  nombre: string; 
  apellido: string;
  email?: string;
  telefono?: string;
};

export default function ProjectAsignacionesPage() {
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

  const [isUpdating, setIsUpdating] = useState<{supervisor: boolean, tecnico: boolean}>({
    supervisor: false,
    tecnico: false
  });

  async function updateAssignment(field: 'voluntarioId' | 'ayudanteId', value: string | null) {
    if (!project) return;

    const updateType = field === 'voluntarioId' ? 'supervisor' : 'tecnico';
    setIsUpdating(prev => ({ ...prev, [updateType]: true }));

    try {
      const res = await fetch(`/api/proyectos/${projectId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [field]: value || null })
      });

      if (!res.ok) throw new Error(await res.text());
      
      await mutate();
      
    } catch (error: any) {
      alert(`Error al actualizar asignación: ${error?.message || error}`);
    } finally {
      setIsUpdating(prev => ({ ...prev, [updateType]: false }));
    }
  }

  function getVolunteerById(id?: string | null): Volunteer | null {
    if (!id) return null;
    return voluntarios.find(v => (v._id || v.id) === id) || null;
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-lg font-medium">Cargando asignaciones...</div>
        </div>
      </div>
    );
  }

  const supervisor = getVolunteerById(project.voluntarioId);
  const tecnico = getVolunteerById(project.ayudanteId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Asignaciones del proyecto</h1>
        <p className="text-sm text-[color:var(--muted)] mt-1">
          Gestiona quién está asignado a este proyecto
        </p>
      </div>

      {/* Asignaciones actuales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supervisor */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Supervisor</h2>
            <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
              Responsable principal
            </span>
          </div>

          {supervisor ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {supervisor.nombre[0]}{supervisor.apellido[0]}
                </div>
                <div className="flex-1">
                  <div className="font-medium">
                    {supervisor.nombre} {supervisor.apellido}
                  </div>
                  {supervisor.email && (
                    <div className="text-sm text-[color:var(--muted)]">
                      {supervisor.email}
                    </div>
                  )}
                  {supervisor.telefono && (
                    <div className="text-sm text-[color:var(--muted)]">
                      {supervisor.telefono}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => updateAssignment('voluntarioId', null)}
                disabled={isUpdating.supervisor}
                className="btn btn-ghost text-red-600 w-full"
              >
                {isUpdating.supervisor ? "Removiendo..." : "Remover supervisor"}
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">👤</div>
              <div className="text-[color:var(--muted)] mb-4">
                Sin supervisor asignado
              </div>
              <div className="space-y-2">
                <select
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) updateAssignment('voluntarioId', value);
                  }}
                  disabled={isUpdating.supervisor}
                  className="select w-full"
                  defaultValue=""
                >
                  <option value="">Seleccionar supervisor</option>
                  {voluntarios.map((v) => (
                    <option key={v._id || v.id} value={v._id || v.id}>
                      {v.nombre} {v.apellido}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Técnico */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Técnico</h2>
            <span className="text-sm px-2 py-1 bg-green-100 text-green-800 rounded">
              Apoyo técnico
            </span>
          </div>

          {tecnico ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {tecnico.nombre[0]}{tecnico.apellido[0]}
                </div>
                <div className="flex-1">
                  <div className="font-medium">
                    {tecnico.nombre} {tecnico.apellido}
                  </div>
                  {tecnico.email && (
                    <div className="text-sm text-[color:var(--muted)]">
                      {tecnico.email}
                    </div>
                  )}
                  {tecnico.telefono && (
                    <div className="text-sm text-[color:var(--muted)]">
                      {tecnico.telefono}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => updateAssignment('ayudanteId', null)}
                disabled={isUpdating.tecnico}
                className="btn btn-ghost text-red-600 w-full"
              >
                {isUpdating.tecnico ? "Removiendo..." : "Remover técnico"}
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🔧</div>
              <div className="text-[color:var(--muted)] mb-4">
                Sin técnico asignado
              </div>
              <div className="space-y-2">
                <select
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) updateAssignment('ayudanteId', value);
                  }}
                  disabled={isUpdating.tecnico}
                  className="select w-full"
                  defaultValue=""
                >
                  <option value="">Seleccionar técnico</option>
                  {voluntarios.map((v) => (
                    <option key={v._id || v.id} value={v._id || v.id}>
                      {v.nombre} {v.apellido}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cambiar asignaciones */}
      {(supervisor || tecnico) && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Cambiar asignaciones</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {supervisor && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Cambiar supervisor</label>
                <select
                  onChange={(e) => {
                    const value = e.target.value;
                    updateAssignment('voluntarioId', value || null);
                  }}
                  disabled={isUpdating.supervisor}
                  className="select w-full"
                  value={project.voluntarioId || ""}
                >
                  <option value="">Sin asignar</option>
                  {voluntarios.map((v) => (
                    <option key={v._id || v.id} value={v._id || v.id}>
                      {v.nombre} {v.apellido}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {tecnico && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Cambiar técnico</label>
                <select
                  onChange={(e) => {
                    const value = e.target.value;
                    updateAssignment('ayudanteId', value || null);
                  }}
                  disabled={isUpdating.tecnico}
                  className="select w-full"
                  value={project.ayudanteId || ""}
                >
                  <option value="">Sin asignar</option>
                  {voluntarios.map((v) => (
                    <option key={v._id || v.id} value={v._id || v.id}>
                      {v.nombre} {v.apellido}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lista de voluntarios disponibles */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Voluntarios disponibles</h2>
        
        {voluntarios.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {voluntarios.map((v) => {
              const isAssigned = (v._id || v.id) === project.voluntarioId || (v._id || v.id) === project.ayudanteId;
              
              return (
                <div 
                  key={v._id || v.id} 
                  className={`
                    p-4 border rounded-lg transition-colors
                    ${isAssigned 
                      ? "border-green-200 bg-green-50" 
                      : "border-[color:var(--border)] hover:bg-gray-50"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-sm font-semibold">
                      {v.nombre[0]}{v.apellido[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {v.nombre} {v.apellido}
                      </div>
                      {v.email && (
                        <div className="text-xs text-[color:var(--muted)] truncate">
                          {v.email}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isAssigned && (
                    <div className="mt-2 text-xs text-green-700 font-medium">
                      {(v._id || v.id) === project.voluntarioId ? "Supervisor asignado" : "Técnico asignado"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-[color:var(--muted)]">
            No hay voluntarios disponibles
          </div>
        )}
      </div>
    </div>
  );
}
