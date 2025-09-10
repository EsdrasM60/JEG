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

export default function ProjectConfiguracionPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const { data: project, mutate } = useSWR<Project>(
    projectId ? `/api/proyectos/${projectId}` : null,
    fetcher
  );

  const { data: voluntariosResp } = useSWR<any>("/api/voluntarios", fetcher);

  const voluntarios = Array.isArray(voluntariosResp)
    ? (voluntariosResp as Volunteer[])
    : ((voluntariosResp?.items || []) as Volunteer[]);

  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Mantener formato para resúmenes (ej. RD$1,000.00)
  function formatCurrency(value: number | undefined | null): string {
    if (value === undefined || value === null) return "";
    try {
      return new Intl.NumberFormat("es-DO", {
        style: "currency",
        currency: "DOP",
        minimumFractionDigits: 2,
      }).format(value);
    } catch {
      return String(value);
    }
  }

  // Formato de input: (1,000.00)
  function formatInputNumber(value: number | undefined | null): string {
    if (value === undefined || value === null || isNaN(Number(value))) return "";
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value));
    return `(${formatted})`;
  }

  // Parse input como número, acepta paréntesis, $, RD$, comas y espacios
  function parseInputCurrency(value: string | undefined | null): number {
    if (!value) return 0;
    const s = String(value);
    // eliminar paréntesis, símbolos de moneda, letras, espacios y comas
    const cleaned = s
      .replace(/[()\s\u00A0]/g, "")
      .replace(/RD\$|RD|\$/gi, "")
      .replace(/,/g, "")
      .replace(/[A-Za-z]/g, "")
      .trim();
    return parseFloat(cleaned) || 0;
  }

  function calcularTotalPresupuesto(presupuesto: any): number {
    const materiales = Number(presupuesto?.materiales || 0) || 0;
    const manoDeObra = Number(presupuesto?.manoDeObra || 0) || 0;
    const direccionTecnica = Number(presupuesto?.direccionTecnica || 0) || 0;
    const indirectos = Number(presupuesto?.indirectos || 0) || 0;
    const itbis = Number(presupuesto?.itbis || 0) || 0;
    return materiales + manoDeObra + direccionTecnica + indirectos + itbis;
  }

  async function updateBudgetField(field: string, value: number) {
    if (!project) return;
    setIsUpdating((prev) => ({ ...prev, [`presupuesto.${field}`]: true }));

    try {
      const currentPresupuesto = project.presupuesto || {};
      const newPresupuesto = { ...currentPresupuesto, [field]: value };
      if (field !== "total") {
        newPresupuesto.total = calcularTotalPresupuesto(newPresupuesto);
      }

      const res = await fetch(`/api/proyectos/${projectId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ presupuesto: newPresupuesto }),
      });

      if (!res.ok) throw new Error(await res.text());
      await mutate();
    } catch (error: any) {
      alert(`Error al actualizar presupuesto: ${error?.message || error}`);
    } finally {
      setIsUpdating((prev) => ({ ...prev, [`presupuesto.${field}`]: false }));
    }
  }

  async function updateField(field: keyof Project, value: any) {
    if (!project) return;
    setIsUpdating((prev) => ({ ...prev, [String(field)]: true }));
    try {
      const res = await fetch(`/api/proyectos/${projectId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error(await res.text());
      await mutate();
    } catch (error: any) {
      alert(`Error al actualizar ${String(field)}: ${error?.message || error}`);
    } finally {
      setIsUpdating((prev) => ({ ...prev, [String(field)]: false }));
    }
  }

  async function deleteProject() {
    if (!project) return;
    try {
      const res = await fetch(`/api/proyectos/${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      window.location.href = "/proyectos";
    } catch (error: any) {
      alert(`Error al eliminar proyecto: ${error?.message || error}`);
    }
  }

  function toDateInputValue(d?: string | null) {
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const estadoOptions = [
    { key: "PLANIFICADO", label: "Sin empezar", icon: "⏳", color: "text-blue-600" },
    { key: "EN_PROGRESO", label: "En curso", icon: "➕", color: "text-indigo-700" },
    { key: "EN_PAUSA", label: "En pausa", icon: "⏸️", color: "text-yellow-600" },
    { key: "COMPLETADO", label: "Completado", icon: "✅", color: "text-green-600" },
  ];

  if (!project) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-lg font-medium">Cargando configuración...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Configuración del proyecto</h1>
        <p className="text-sm text-[color:var(--muted)] mt-1">Edita la información básica del proyecto</p>
      </div>

      {/* Información básica */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Información básica</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Título del proyecto</label>
            <input
              type="text"
              defaultValue={project.titulo}
              className="w-full input"
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value && value !== project.titulo) updateField("titulo", value);
              }}
              disabled={isUpdating.titulo}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción</label>
            <textarea
              defaultValue={project.descripcion || ""}
              className="w-full textarea min-h-[100px]"
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value !== (project.descripcion || "")) updateField("descripcion", value || null);
              }}
              disabled={isUpdating.descripcion}
              placeholder="Describe el objetivo y alcance del proyecto..."
            />
          </div>
        </div>
      </div>

      {/* Estado */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Estado del proyecto</h2>
        <div className="grid gap-3">
          {estadoOptions.map((opt) => (
            <label
              key={opt.key}
              className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] px-4 py-3 hover:bg-white/5 cursor-pointer"
            >
              <input
                type="radio"
                name="estado"
                value={opt.key}
                checked={opt.key === project.estado}
                onChange={(e) => {
                  if (e.target.checked) updateField("estado", opt.key);
                }}
                disabled={isUpdating.estado}
                className="accent-[color:var(--brand)]"
              />
              <span className={opt.color}>{opt.icon}</span>
              <span className="text-sm font-medium">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Fechas */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Cronograma</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Fecha de inicio</label>
            <input
              type="date"
              defaultValue={toDateInputValue(project.fechaInicio)}
              className="w-full input"
              onChange={(e) => updateField("fechaInicio", e.target.value || null)}
              disabled={isUpdating.fechaInicio}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Fecha de finalización</label>
            <input
              type="date"
              defaultValue={toDateInputValue(project.fechaFin)}
              className="w-full input"
              onChange={(e) => updateField("fechaFin", e.target.value || null)}
              disabled={isUpdating.fechaFin}
            />
          </div>
        </div>
      </div>

      {/* Asignaciones */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Asignaciones</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Supervisor</label>
            <select
              value={project.voluntarioId || ""}
              onChange={(e) => updateField("voluntarioId", e.target.value || null)}
              disabled={isUpdating.voluntarioId}
              className="select w-full"
            >
              <option value="">Sin asignar</option>
              {voluntarios.map((v) => (
                <option key={v._id || v.id} value={v._id || v.id}>
                  {v.nombre} {v.apellido}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Técnico</label>
            <select
              value={project.ayudanteId || ""}
              onChange={(e) => updateField("ayudanteId", e.target.value || null)}
              disabled={isUpdating.ayudanteId}
              className="select w-full"
            >
              <option value="">Sin asignar</option>
              {voluntarios.map((v) => (
                <option key={v._id || v.id} value={v._id || v.id}>
                  {v.nombre} {v.apellido}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Presupuesto aprobado */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Presupuesto aprobado</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Materiales */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Materiales</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[color:var(--muted)] text-sm">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  defaultValue={project.presupuesto?.materiales ? formatInputNumber(project.presupuesto.materiales) : ""}
                  className="w-full input pl-8"
                  placeholder="(0.00)"
                  onFocus={(e) => {
                    e.currentTarget.value = String(parseInputCurrency(e.currentTarget.value) || "");
                  }}
                  onBlur={(e) => {
                    const parsed = parseInputCurrency(e.currentTarget.value);
                    if (parsed !== (project.presupuesto?.materiales || 0)) updateBudgetField("materiales", parsed);
                    e.currentTarget.value = parsed ? formatInputNumber(parsed) : "";
                  }}
                  disabled={isUpdating["presupuesto.materiales"]}
                />
              </div>
              {project.presupuesto?.materiales !== undefined && (
                <div className="text-xs text-[color:var(--muted)]">{formatCurrency(project.presupuesto.materiales)}</div>
              )}
            </div>

            {/* Mano de obra */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mano de obra</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[color:var(--muted)] text-sm">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  defaultValue={project.presupuesto?.manoDeObra ? formatInputNumber(project.presupuesto.manoDeObra) : ""}
                  className="w-full input pl-8"
                  placeholder="(0.00)"
                  onFocus={(e) => {
                    e.currentTarget.value = String(parseInputCurrency(e.currentTarget.value) || "");
                  }}
                  onBlur={(e) => {
                    const parsed = parseInputCurrency(e.currentTarget.value);
                    if (parsed !== (project.presupuesto?.manoDeObra || 0)) updateBudgetField("manoDeObra", parsed);
                    e.currentTarget.value = parsed ? formatInputNumber(parsed) : "";
                  }}
                  disabled={isUpdating["presupuesto.manoDeObra"]}
                />
              </div>
              {project.presupuesto?.manoDeObra !== undefined && (
                <div className="text-xs text-[color:var(--muted)]">{formatCurrency(project.presupuesto.manoDeObra)}</div>
              )}
            </div>

            {/* Dirección técnica */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Dirección técnica</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[color:var(--muted)] text-sm">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  defaultValue={project.presupuesto?.direccionTecnica ? formatInputNumber(project.presupuesto.direccionTecnica) : ""}
                  className="w-full input pl-8"
                  placeholder="(0.00)"
                  onFocus={(e) => {
                    e.currentTarget.value = String(parseInputCurrency(e.currentTarget.value) || "");
                  }}
                  onBlur={(e) => {
                    const parsed = parseInputCurrency(e.currentTarget.value);
                    if (parsed !== (project.presupuesto?.direccionTecnica || 0)) updateBudgetField("direccionTecnica", parsed);
                    e.currentTarget.value = parsed ? formatInputNumber(parsed) : "";
                  }}
                  disabled={isUpdating["presupuesto.direccionTecnica"]}
                />
              </div>
              {project.presupuesto?.direccionTecnica !== undefined && (
                <div className="text-xs text-[color:var(--muted)]">{formatCurrency(project.presupuesto.direccionTecnica)}</div>
              )}
            </div>

            {/* Indirectos */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Indirectos</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[color:var(--muted)] text-sm">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  defaultValue={project.presupuesto?.indirectos ? formatInputNumber(project.presupuesto.indirectos) : ""}
                  className="w-full input pl-8"
                  placeholder="(0.00)"
                  onFocus={(e) => {
                    e.currentTarget.value = String(parseInputCurrency(e.currentTarget.value) || "");
                  }}
                  onBlur={(e) => {
                    const parsed = parseInputCurrency(e.currentTarget.value);
                    if (parsed !== (project.presupuesto?.indirectos || 0)) updateBudgetField("indirectos", parsed);
                    e.currentTarget.value = parsed ? formatInputNumber(parsed) : "";
                  }}
                  disabled={isUpdating["presupuesto.indirectos"]}
                />
              </div>
              {project.presupuesto?.indirectos !== undefined && (
                <div className="text-xs text-[color:var(--muted)]">{formatCurrency(project.presupuesto.indirectos)}</div>
              )}
            </div>

            {/* ITBIS */}
            <div className="space-y-2">
              <label className="text-sm font-medium">ITBIS</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[color:var(--muted)] text-sm">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  defaultValue={project.presupuesto?.itbis ? formatInputNumber(project.presupuesto.itbis) : ""}
                  className="w-full input pl-8"
                  placeholder="(0.00)"
                  onFocus={(e) => {
                    e.currentTarget.value = String(parseInputCurrency(e.currentTarget.value) || "");
                  }}
                  onBlur={(e) => {
                    const parsed = parseInputCurrency(e.currentTarget.value);
                    if (parsed !== (project.presupuesto?.itbis || 0)) updateBudgetField("itbis", parsed);
                    e.currentTarget.value = parsed ? formatInputNumber(parsed) : "";
                  }}
                  disabled={isUpdating["presupuesto.itbis"]}
                />
              </div>
              {project.presupuesto?.itbis !== undefined && (
                <div className="text-xs text-[color:var(--muted)]">{formatCurrency(project.presupuesto.itbis)}</div>
              )}
            </div>

            {/* Total */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Total</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[color:var(--muted)] text-sm">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatInputNumber(project.presupuesto?.total || calcularTotalPresupuesto(project.presupuesto))}
                  readOnly
                  className="w-full input pl-8 bg-gray-50"
                />
              </div>
              <div className="text-xs text-[color:var(--muted)]">
                {formatCurrency(project.presupuesto?.total || calcularTotalPresupuesto(project.presupuesto))}
              </div>
            </div>
          </div>

          {/* Resumen del presupuesto */}
          {project.presupuesto &&
            Object.values(project.presupuesto).some((v) => v && v > 0) && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-3">Resumen del presupuesto</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
                  <div>
                    <div className="text-blue-600 font-medium">Materiales</div>
                    <div className="text-blue-800">{formatCurrency(project.presupuesto.materiales)}</div>
                  </div>
                  <div>
                    <div className="text-blue-600 font-medium">M. Obra</div>
                    <div className="text-blue-800">{formatCurrency(project.presupuesto.manoDeObra)}</div>
                  </div>
                  <div>
                    <div className="text-blue-600 font-medium">D. Técnica</div>
                    <div className="text-blue-800">{formatCurrency(project.presupuesto.direccionTecnica)}</div>
                  </div>
                  <div>
                    <div className="text-blue-600 font-medium">Indirectos</div>
                    <div className="text-blue-800">{formatCurrency(project.presupuesto.indirectos)}</div>
                  </div>
                  <div>
                    <div className="text-blue-600 font-medium">ITBIS</div>
                    <div className="text-blue-800">{formatCurrency(project.presupuesto.itbis)}</div>
                  </div>
                  <div className="border-l border-blue-300 pl-4">
                    <div className="text-blue-700 font-semibold">TOTAL</div>
                    <div className="text-blue-900 font-bold text-lg">
                      {formatCurrency(project.presupuesto.total || calcularTotalPresupuesto(project.presupuesto))}
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Acciones peligrosas */}
      <div className="card p-6 border-red-200">
        <h2 className="text-lg font-semibold mb-4 text-red-800">Zona de peligro</h2>
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-red-600 text-xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-medium text-red-800">Eliminar proyecto</h3>
                <p className="text-sm text-red-600 mt-1">
                  Esta acción no se puede deshacer. Se eliminarán todas las evidencias, listas de verificación y datos asociados al proyecto.
                </p>
              </div>
            </div>
          </div>

          <button onClick={() => setShowDeleteConfirm(true)} className="btn bg-red-600 text-white hover:bg-red-700">
            Eliminar proyecto
          </button>
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center">
              <div className="text-4xl mb-4">🗑️</div>
              <h3 className="text-lg font-semibold mb-2">¿Eliminar proyecto?</h3>
              <p className="text-sm text-[color:var(--muted)] mb-6">
                Esta acción eliminará permanentemente el proyecto "{project.titulo}" y todos sus datos asociados. No se puede deshacer.
              </p>

              <div className="flex gap-3 justify-center">
                <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-ghost">Cancelar</button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    deleteProject();
                  }}
                  className="btn bg-red-600 text-white hover:bg-red-700"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
