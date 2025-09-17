"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";

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

type Volunteer = { _id?: string; id?: string; nombre: string; apellido: string };

export default function NuevoProyectoPage() {
  const router = useRouter();
  const { data: voluntariosResp } = useSWR<any>("/api/voluntarios", fetcher);
  const { data: checklistTemplates } = useSWR<any[]>('/api/checklist-templates', fetcher);
  
  const [evidencias, setEvidencias] = useState<Array<{ 
    mediaId: string; 
    thumbId?: string; 
    titulo?: string; 
    puntos: string[]; 
    thumbUrl: string 
  }>>([]);
  
  const [createChecklistList, setCreateChecklistList] = useState<Array<{ text: string; done: boolean }>>([]);
  const [createChecklistInput, setCreateChecklistInput] = useState("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateCount, setTemplateCount] = useState<number>(1);
  const [templateBaseName, setTemplateBaseName] = useState<string>("Tarea");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [renameItems, setRenameItems] = useState(false);
  const [renameBase, setRenameBase] = useState('Tarea');

  const fileRefCreate = useRef<HTMLInputElement>(null);

  const voluntarios = Array.isArray(voluntariosResp) 
    ? voluntariosResp as Volunteer[]
    : (voluntariosResp?.items || []) as Volunteer[];

  // Helper to parse currency-like input strings (removes any non-numeric except dot/minus)
  function parseCurrencyInput(value: string | null | undefined): number {
    if (!value) return 0;
    const cleaned = String(value).replace(/[^\d.\-]/g, '');
    return parseFloat(cleaned) || 0;
  }

  function formatNumber(value: number): string {
    if (value === null || value === undefined) return '';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }

  async function crearProyecto(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const fd = new FormData(e.currentTarget);
      
      // Construir objeto de presupuesto
      const presupuesto = {
        materiales: parseCurrencyInput(fd.get("presupuesto_materiales") as string),
        manoDeObra: parseCurrencyInput(fd.get("presupuesto_manoDeObra") as string),
        direccionTecnica: parseCurrencyInput(fd.get("presupuesto_direccionTecnica") as string),
        indirectos: parseCurrencyInput(fd.get("presupuesto_indirectos") as string),
        itbis: parseCurrencyInput(fd.get("presupuesto_itbis") as string),
        total: parseCurrencyInput(fd.get("presupuesto_total") as string),
      };
      
      // Solo incluir presupuesto si tiene al menos un valor
      const hasPresupuesto = Object.values(presupuesto).some(val => val > 0);
      
      const payload: any = {
        titulo: fd.get("titulo"),
        descripcion: fd.get("descripcion") || null,
        estado: fd.get("estado") || "PLANIFICADO",
        voluntarioId: fd.get("voluntarioId") || null,
        ayudanteId: fd.get("ayudanteId") || null,
        fechaInicio: fd.get("fechaInicio") || null,
        fechaFin: fd.get("fechaFin") || null,
        evidencias: evidencias.map(ev => ({ 
          mediaId: ev.mediaId, 
          thumbId: ev.thumbId, 
          titulo: ev.titulo, 
          puntos: ev.puntos 
        })),
        checklist: createChecklistList,
      };
      
      // Agregar presupuesto si tiene datos
      if (hasPresupuesto) {
        payload.presupuesto = presupuesto;
      }
      
      const res = await fetch("/api/proyectos", { 
        method: "POST", 
        headers: { "content-type": "application/json" }, 
        body: JSON.stringify(payload) 
      });
      
      if (!res.ok) throw new Error("Error al crear proyecto");
      
      const newProject = await res.json();
      router.push(`/proyectos/${newProject._id}`);
      
    } catch (error) {
      alert("Error al crear proyecto: " + error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onUploadChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      if (!res.ok) continue;
      const json = await res.json();
      const thumbUrl = `/api/images/${json.thumbId}?thumb=1`;
      setEvidencias(prev => [...prev, { 
        mediaId: json.id, 
        thumbId: json.thumbId, 
        titulo: file.name, 
        puntos: [], 
        thumbUrl 
      }]);
    }
    e.currentTarget.value = "";
  }

  function actualizarPuntos(idx: number, text: string) {
    const puntos = text.split(/\r?\n|,|;/).map(s => s.trim()).filter(Boolean);
    setEvidencias(prev => prev.map((ev, i) => i === idx ? { ...ev, puntos } : ev));
  }

  function actualizarTitulo(idx: number, titulo: string) {
    setEvidencias(prev => prev.map((ev, i) => i === idx ? { ...ev, titulo } : ev));
  }

  function quitarEvidencia(idx: number) {
    setEvidencias(prev => prev.filter((_, i) => i !== idx));
  }

  const estadoOptions = [
    { key: "PLANIFICADO", label: "Sin empezar", icon: "⏳", color: "text-blue-600" },
    { key: "EN_PROGRESO", label: "En curso", icon: "➕", color: "text-indigo-700" },
    { key: "EN_PAUSA", label: "En pausa", icon: "⏸️", color: "text-yellow-600" },
    { key: "COMPLETADO", label: "Completado", icon: "✅", color: "text-green-600" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/proyectos" 
          className="btn btn-ghost"
          title="Volver a proyectos"
        >
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold">Crear nuevo proyecto</h1>
      </div>

      {/* Formulario */}
      <form onSubmit={crearProyecto} className="space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Información básica</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="titulo" className="block text-sm font-medium mb-2">Título del proyecto *</label>
              <input
                id="titulo"
                name="titulo"
                placeholder="Ej. Reparación del sistema de bombeo"
                className="w-full input"
                required
              />
            </div>
            
            <div>
              <label htmlFor="descripcion" className="block text-sm font-medium mb-2">Descripción</label>
              <textarea
                id="descripcion"
                name="descripcion"
                placeholder="Describe el objetivo y alcance del proyecto..."
                className="w-full textarea min-h-[100px]"
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Estado inicial</h2>
          
          <div className="grid gap-3">
            {estadoOptions.map(opt => (
              <label 
                key={opt.key} 
                className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] px-4 py-3 hover:bg-white/5 cursor-pointer"
              >
                <input 
                  type="radio" 
                  name="estado" 
                  value={opt.key} 
                  defaultChecked={opt.key === "PLANIFICADO"} 
                  className="accent-[color:var(--brand)]"
                  title={opt.label}
                  aria-label={opt.label}
                />
                <span className={opt.color}>{opt.icon}</span>
                <span className="text-sm font-medium">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Cronograma</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fechaInicio" className="block text-sm font-medium mb-2">Fecha de inicio</label>
              <input
                id="fechaInicio"
                name="fechaInicio"
                type="date"
                className="w-full input"
              />
            </div>
            
            <div>
              <label htmlFor="fechaFin" className="block text-sm font-medium mb-2">Fecha de finalización</label>
              <input
                id="fechaFin"
                name="fechaFin"
                type="date"
                className="w-full input"
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Asignaciones</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="voluntarioId" className="block text-sm font-medium mb-2">Supervisor</label>
              <select id="voluntarioId" name="voluntarioId" className="select w-full" defaultValue="">
                <option value="">Sin asignar</option>
                {voluntarios.map((v) => (
                  <option key={v._id || v.id} value={v._id || v.id}>
                    {v.nombre} {v.apellido}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="ayudanteId" className="block text-sm font-medium mb-2">Técnico</label>
              <select id="ayudanteId" name="ayudanteId" className="select w-full" defaultValue="">
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

        {/* Evidencias iniciales */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Evidencias iniciales (opcional)</h2>
          
          <input
            ref={fileRefCreate}
            type="file"
            accept="image/*"
            multiple
            onChange={onUploadChange}
            className="hidden"
            aria-hidden="true"
          />
          
          <button 
            type="button" 
            onClick={() => fileRefCreate.current?.click()} 
            className="btn btn-ghost mb-4"
          >
            📸 Agregar fotos
          </button>
          
          {evidencias.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {evidencias.map((ev, idx) => (
                <div key={idx} className="border border-[color:var(--border)] rounded-lg p-3 space-y-3">
                  <img 
                    src={ev.thumbUrl} 
                    alt={ev.titulo || "evidencia"} 
                    className="w-full h-32 object-cover rounded" 
                  />
                  
                  <input
                    value={ev.titulo || ""}
                    onChange={(e) => actualizarTitulo(idx, e.target.value)}
                    className="w-full input text-sm"
                    placeholder="Título de la foto"
                    aria-label={`Título de la foto ${idx + 1}`}
                  />
                  
                  <textarea
                    onChange={(e) => actualizarPuntos(idx, e.target.value)}
                    className="w-full textarea text-sm min-h-[60px]"
                    placeholder="Puntos a tratar (uno por línea)"
                    aria-label={`Puntos a tratar para la foto ${idx + 1}`}
                  />
                  
                  <button 
                    type="button" 
                    className="btn btn-ghost text-red-600 text-sm w-full" 
                    onClick={() => quitarEvidencia(idx)}
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Presupuesto inicial */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Presupuesto inicial (opcional)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Materiales */}
            <div className="space-y-2">
              <label htmlFor="presupuesto_materiales" className="text-sm font-medium">Materiales</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[color:var(--muted)] text-sm">$</span>
                <input
                  id="presupuesto_materiales"
                  name="presupuesto_materiales"
                  type="text"
                  inputMode="decimal"
                  className="w-full input pl-8"
                  placeholder="0.00"
                  onBlur={(e) => { e.currentTarget.value = formatNumber(parseCurrencyInput(e.currentTarget.value)); }}
                  onFocus={(e) => { e.currentTarget.value = String(parseCurrencyInput(e.currentTarget.value) || ''); }}
                />
              </div>
            </div>

            {/* Mano de obra */}
            <div className="space-y-2">
              <label htmlFor="presupuesto_manoDeObra" className="text-sm font-medium">Mano de obra</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[color:var(--muted)] text-sm">$</span>
                <input
                  id="presupuesto_manoDeObra"
                  name="presupuesto_manoDeObra"
                  type="text"
                  inputMode="decimal"
                  className="w-full input pl-8"
                  placeholder="0.00"
                  onBlur={(e) => { e.currentTarget.value = formatNumber(parseCurrencyInput(e.currentTarget.value)); }}
                  onFocus={(e) => { e.currentTarget.value = String(parseCurrencyInput(e.currentTarget.value) || ''); }}
                 />
              </div>
            </div>

            {/* Dirección técnica */}
            <div className="space-y-2">
              <label htmlFor="presupuesto_direccionTecnica" className="text-sm font-medium">Dirección técnica</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[color:var(--muted)] text-sm">$</span>
                <input
                  id="presupuesto_direccionTecnica"
                  name="presupuesto_direccionTecnica"
                  type="text"
                  inputMode="decimal"
                  className="w-full input pl-8"
                  placeholder="0.00"
                  onBlur={(e) => { e.currentTarget.value = formatNumber(parseCurrencyInput(e.currentTarget.value)); }}
                  onFocus={(e) => { e.currentTarget.value = String(parseCurrencyInput(e.currentTarget.value) || ''); }}
                 />
              </div>
            </div>

            {/* Indirectos */}
            <div className="space-y-2">
              <label htmlFor="presupuesto_indirectos" className="text-sm font-medium">Indirectos</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[color:var(--muted)] text-sm">$</span>
                <input
                  id="presupuesto_indirectos"
                  name="presupuesto_indirectos"
                  type="text"
                  inputMode="decimal"
                  className="w-full input pl-8"
                  placeholder="0.00"
                  onBlur={(e) => { e.currentTarget.value = formatNumber(parseCurrencyInput(e.currentTarget.value)); }}
                  onFocus={(e) => { e.currentTarget.value = String(parseCurrencyInput(e.currentTarget.value) || ''); }}
                 />
              </div>
            </div>

            {/* ITBIS */}
            <div className="space-y-2">
              <label htmlFor="presupuesto_itbis" className="text-sm font-medium">ITBIS</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[color:var(--muted)] text-sm">$</span>
                <input
                  id="presupuesto_itbis"
                  name="presupuesto_itbis"
                  type="text"
                  inputMode="decimal"
                  className="w-full input pl-8"
                  placeholder="0.00"
                  onBlur={(e) => { e.currentTarget.value = formatNumber(parseCurrencyInput(e.currentTarget.value)); }}
                  onFocus={(e) => { e.currentTarget.value = String(parseCurrencyInput(e.currentTarget.value) || ''); }}
                 />
              </div>
            </div>

            {/* Total */}
            <div className="space-y-2">
              <label htmlFor="presupuesto_total" className="text-sm font-medium">Total</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[color:var(--muted)] text-sm">$</span>
                <input
                  id="presupuesto_total"
                  name="presupuesto_total"
                  type="text"
                  inputMode="decimal"
                  className="w-full input pl-8"
                  placeholder="0.00"
                  onBlur={(e) => { e.currentTarget.value = formatNumber(parseCurrencyInput(e.currentTarget.value)); }}
                  onFocus={(e) => { e.currentTarget.value = String(parseCurrencyInput(e.currentTarget.value) || ''); }}
                 />
               </div>
             </div>
           </div>

          <div className="mt-4 text-sm text-[color:var(--muted)]">
            💡 Puedes dejar estos campos vacíos y agregar el presupuesto más tarde en la configuración del proyecto.
          </div>
        </div>

        {/* Checklist inicial */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Lista de verificación inicial (opcional)</h2>
          
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              className="btn btn-ghost"
              aria-haspopup="dialog"
            >
              📋 Usar plantilla
            </button>
          </div>
          
          {/* Modal: elegir plantilla (cantidad y nombre base) */}
          {showTemplateModal && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Usar plantilla">
              <div className="bg-white rounded-lg max-w-lg w-full p-6">
                <h3 className="text-lg font-semibold mb-3">Usar plantilla</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="templateSelect">Seleccionar plantilla</label>
                    <select
                      id="templateSelect"
                      className="select w-full"
                      value={selectedTemplateId || ''}
                      onChange={(e) => setSelectedTemplateId(e.target.value || null)}
                    >
                      <option value="">-- Elige una plantilla --</option>
                      {Array.isArray(checklistTemplates) && checklistTemplates.map((t) => (
                        <option key={t._id} value={t._id}>{t.title}</option>
                      ))}
                    </select>
                    <p className="text-xs text-[color:var(--muted)] mt-1">Si no eliges plantilla, se generará usando el nombre base.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="countInput">¿Cuántas veces añadir?</label>
                    <input
                      id="countInput"
                      type="number"
                      min={1}
                      max={100}
                      value={templateCount}
                      onChange={(e) => setTemplateCount(Number(e.target.value || 1))}
                      className="w-32 input"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input id="renameToggle" type="checkbox" checked={renameItems} onChange={(e) => setRenameItems(e.target.checked)} />
                    <label htmlFor="renameToggle" className="text-sm">Renombrar ítems</label>
                  </div>

                  {renameItems && (
                    <div>
                      <label className="block text-sm font-medium mb-1" htmlFor="renameBase">Nombre base</label>
                      <input id="renameBase" type="text" value={renameBase} onChange={(e) => setRenameBase(e.target.value)} className="w-full input" placeholder="Ej. Inspección bomba" />
                      <p className="text-xs text-[color:var(--muted)] mt-1">Si renombrar está activado, los ítems se nombrarán con este base + índice.</p>
                    </div>
                  )}

                  {selectedTemplateId && Array.isArray(checklistTemplates) && (
                    <div className="mt-3 p-3 border rounded bg-gray-50">
                      <div className="text-sm font-medium mb-2">Vista previa de plantilla</div>
                      <ul className="text-sm list-disc pl-5">
                        {(checklistTemplates.find(t => t._id === selectedTemplateId)?.items || []).slice(0, 10).map((it: any, i: number) => (
                          <li key={i}>{it.text || it}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" className="btn btn-ghost" onClick={() => { setShowTemplateModal(false); setSelectedTemplateId(null); setRenameItems(false); setRenameBase('Tarea'); setTemplateCount(1); }}>Cancelar</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      const count = Math.max(1, Math.min(100, Number(templateCount || 1)));
                      const template = Array.isArray(checklistTemplates) ? checklistTemplates.find(t => t._id === selectedTemplateId) : null;
                      let itemsToAdd: Array<{ text: string; done: boolean }> = [];
                      if (template && Array.isArray(template.items) && template.items.length > 0) {
                        // replicate template items 'count' times
                        for (let n = 0; n < count; n++) {
                          template.items.forEach((it: any, idx: number) => {
                            const baseText = typeof it === 'string' ? it : String(it?.text || '');
                            const text = renameItems ? `${renameBase} ${n + 1} - ${idx + 1}` : baseText;
                            itemsToAdd.push({ text, done: false });
                          });
                        }
                      } else {
                        // generate using renameBase
                        for (let i = 0; i < count; i++) {
                          itemsToAdd.push({ text: `${renameBase} ${i + 1}`, done: false });
                        }
                      }

                      setCreateChecklistList(prev => [...prev, ...itemsToAdd]);
                      setShowTemplateModal(false);
                      setSelectedTemplateId(null);
                      setRenameItems(false);
                      setRenameBase('Tarea');
                      setTemplateCount(1);
                    }}
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {createChecklistList.map((item, idx) => (
              <div key={`${item.text}-${idx}`} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={!!item.done}
                  onChange={(e) => {
                    const checked = e.currentTarget.checked;
                    setCreateChecklistList(prev => prev.map((it, i) =>
                      i === idx ? { ...it, done: checked } : it
                    ));
                  }}
                  aria-label={`Marcar "${item.text}" como completado`}
                  title={`Marcar "${item.text}" como completado`}
                />
                <span className={`flex-1 text-sm ${item.done ? "line-through opacity-70" : ""}`}>
                  {item.text}
                </span>
                <button 
                  type="button" 
                  onClick={() => setCreateChecklistList(prev => prev.filter((_, i) => i !== idx))} 
                  className="text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </div>
            ))}
            
            <div className="flex gap-2">
              <input 
                type="text" 
                value={createChecklistInput}
                onChange={(e) => setCreateChecklistInput(e.target.value)}
                className="flex-1 input"
                placeholder="Ej. Revisar bomba de agua"
                aria-label="Nueva tarea"
                title="Nueva tarea"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const t = createChecklistInput.trim(); 
                      if (!t) return; 
                      setCreateChecklistList(prev => [...prev, { text: t, done: false }]); 
                      setCreateChecklistInput("");
                    }
                  }}
                />
              <button 
                type="button" 
                className="btn" 
                onClick={() => { 
                  const t = createChecklistInput.trim(); 
                  if (!t) return; 
                  setCreateChecklistList(prev => [...prev, { text: t, done: false }]); 
                  setCreateChecklistInput(""); 
                }}
              >
                Agregar
              </button>
            </div>
            
            <div className="mt-4 text-sm text-[color:var(--muted)]">
              💡 También puedes agregar categorías específicas después de crear el proyecto usando plantillas predefinidas como "Obra Gris", "Alambrado", etc.
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3 justify-end">
          <Link href="/proyectos" className="btn btn-ghost">
            Cancelar
          </Link>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creando..." : "Crear proyecto"}
          </button>
        </div>
      </form>
    </div>
  );
}
