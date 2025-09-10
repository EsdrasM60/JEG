"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { useState, useMemo } from "react";

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

type ChecklistItem = { 
  text: string; 
  done: boolean 
};

type ChecklistCategory = {
  _id: string;
  title: string;
  items: ChecklistItem[];
  isCollapsed: boolean;
  order: number;
};

type Project = {
  _id: string;
  titulo: string;
  checklist?: ChecklistItem[]; // legacy
  checklistCategories?: ChecklistCategory[];
};

type Template = {
  _id: string;
  title: string;
  description: string;
  category: string;
  items: Array<{ text: string; order: number }>;
};

export default function ProjectChecklistPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const { data: project, mutate } = useSWR<Project>(
    projectId ? `/api/proyectos/${projectId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0
    }
  );

  const [newItemText, setNewItemText] = useState("");
  const [newCategoryTitle, setNewCategoryTitle] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryTitle, setEditingCategoryTitle] = useState("");

  // Estados para crear plantilla
  const [newTemplate, setNewTemplate] = useState({
    title: "",
    description: "",
    category: "",
    items: [""]
  });

  // SWR para templates - solo carga cuando sea necesario
  const { data: templates, mutate: mutateTemplates } = useSWR<Template[]>(
    showTemplates || showCreateTemplate ? "/api/checklist-templates" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0
    }
  );

  // Migrar checklist legacy a categorías si es necesario
  const checklistCategories = project?.checklistCategories || [];
  const hasLegacyChecklist = project?.checklist && project.checklist.length > 0 && checklistCategories.length === 0;

  async function updateProject(updates: any) {
    try {
      const res = await fetch(`/api/proyectos/${projectId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(updates)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      
      const responseData = await res.json();
      
      // Solo una mutación optimista - mucho más rápido
      await mutate(responseData, false);
    } catch (error: any) {
      console.error("Error actualizando proyecto:", error);
      alert(`Error actualizando proyecto: ${error?.message || error}`);
    }
  }

  async function migrateLegacyChecklist() {
    if (!project?.checklist) return;
    
    const newCategory = {
      title: "Lista general",
      items: project.checklist,
      isCollapsed: false,
      order: 0
    };

    await updateProject({
      checklistCategories: [newCategory],
      checklist: [] // limpiar legacy
    });
  }

  async function addCategory() {
    if (!newCategoryTitle.trim()) return;
    
    const newCategory = {
      title: newCategoryTitle.trim(),
      items: [],
      isCollapsed: false,
      order: checklistCategories.length
    };

    await updateProject({
      checklistCategories: [...checklistCategories, newCategory]
    });

    setNewCategoryTitle("");
    setShowAddCategory(false);
  }

  async function addCategoryFromTemplate(template: Template) {
    const newCategory = {
      title: template.title,
      items: template.items
        .sort((a, b) => a.order - b.order)
        .map(item => ({ text: item.text, done: false })),
      isCollapsed: false,
      order: checklistCategories.length
    };

    await updateProject({
      checklistCategories: [...checklistCategories, newCategory]
    });

    // Incrementar contador de uso de la plantilla
    try {
      await fetch(`/api/checklist-templates/${template._id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ 
          ...template, 
          usageCount: (template as any).usageCount + 1 
        })
      });
    } catch (error) {
      console.warn("Error actualizando contador de plantilla:", error);
    }

    setShowTemplates(false);
  }

  async function updateCategoryTitle(categoryId: string, newTitle: string) {
    const updatedCategories = checklistCategories.map(cat => 
      cat._id === categoryId ? { ...cat, title: newTitle } : cat
    );
    await updateProject({ checklistCategories: updatedCategories });
    setEditingCategory(null);
  }

  async function toggleCategoryCollapse(categoryId: string) {
    const updatedCategories = checklistCategories.map(cat => 
      cat._id === categoryId ? { ...cat, isCollapsed: !cat.isCollapsed } : cat
    );
    await updateProject({ checklistCategories: updatedCategories });
  }

  async function deleteCategory(categoryId: string) {
    if (!confirm("¿Estás seguro de que quieres eliminar esta categoría?")) return;
    
    const updatedCategories = checklistCategories.filter(cat => cat._id !== categoryId);
    await updateProject({ checklistCategories: updatedCategories });
  }

  // Funciones para crear plantillas
  async function createTemplate() {
    if (!newTemplate.title.trim()) return;

    const templateData = {
      title: newTemplate.title.trim(),
      description: newTemplate.description.trim(),
      category: newTemplate.category.trim() || "Personalizada",
      items: newTemplate.items
        .map((text, index) => ({ text: text.trim(), order: index }))
        .filter(item => item.text)
    };

    if (templateData.items.length === 0) {
      alert("Debes agregar al menos una tarea a la plantilla");
      return;
    }

    try {
      const res = await fetch("/api/checklist-templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(templateData)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      // Limpiar formulario
      setNewTemplate({
        title: "",
        description: "",
        category: "",
        items: [""]
      });
      setShowCreateTemplate(false);
      
      // Revalidar templates para incluir el nuevo
      if (mutateTemplates) {
        mutateTemplates();
      }
      
      alert("Plantilla creada exitosamente");
    } catch (error: any) {
      alert(`Error creando plantilla: ${error?.message || error}`);
    }
  }

  function addTemplateItem() {
    setNewTemplate(prev => ({
      ...prev,
      items: [...prev.items, ""]
    }));
  }

  function updateTemplateItem(index: number, value: string) {
    setNewTemplate(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? value : item)
    }));
  }

  function removeTemplateItem(index: number) {
    if (newTemplate.items.length <= 1) return;
    setNewTemplate(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  }

  async function addItemToCategory(categoryId: string) {
    if (!newItemText.trim()) return;

    const updatedCategories = checklistCategories.map(cat => 
      cat._id === categoryId 
        ? { ...cat, items: [...cat.items, { text: newItemText.trim(), done: false }] }
        : cat
    );
    
    await updateProject({ checklistCategories: updatedCategories });
    setNewItemText("");
  }

  async function toggleItem(categoryId: string, itemIndex: number) {
    const updatedCategories = checklistCategories.map(cat => 
      cat._id === categoryId 
        ? {
            ...cat, 
            items: cat.items.map((item, idx) => 
              idx === itemIndex ? { ...item, done: !item.done } : item
            )
          }
        : cat
    );
    
    await updateProject({ checklistCategories: updatedCategories });
  }

  async function deleteItem(categoryId: string, itemIndex: number) {
    const updatedCategories = checklistCategories.map(cat => 
      cat._id === categoryId 
        ? { ...cat, items: cat.items.filter((_, idx) => idx !== itemIndex) }
        : cat
    );
    
    await updateProject({ checklistCategories: updatedCategories });
  }

  // Calcular progreso total
  const totalItems = checklistCategories.reduce((acc, cat) => acc + cat.items.length, 0);
  const completedItems = checklistCategories.reduce(
    (acc, cat) => acc + cat.items.filter(item => item.done).length, 
    0
  );
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Agrupar plantillas por categoría
  const templatesByCategory = templates?.reduce((acc, template) => {
    const category = template.category || "Otros";
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {} as Record<string, Template[]>) || {};

  if (!project) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-lg font-medium">Cargando checklist...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con progreso */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Lista de verificación</h1>
          <p className="text-sm text-[color:var(--muted)] mt-1">
            {completedItems} de {totalItems} tareas completadas ({progressPercent}%)
          </p>
        </div>
        
        {/* Barra de progreso */}
        {totalItems > 0 && (
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Migración de checklist legacy */}
      {hasLegacyChecklist && (
        <div className="card p-4 border-blue-200 bg-blue-50">
          <div className="flex items-start gap-3">
            <span className="text-blue-600 text-xl">💡</span>
            <div className="flex-1">
              <h3 className="font-medium text-blue-800">Actualizar lista de verificación</h3>
              <p className="text-sm text-blue-600 mt-1">
                Tienes una lista de verificación en formato anterior. ¿Quieres migrarla al nuevo formato con categorías?
              </p>
              <button 
                onClick={migrateLegacyChecklist}
                className="btn btn-sm bg-blue-600 text-white hover:bg-blue-700 mt-3"
              >
                Migrar a categorías
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex gap-3">
        <button 
          onClick={() => setShowAddCategory(true)}
          className="btn btn-primary"
        >
          ➕ Nueva categoría
        </button>
        <button 
          onClick={() => setShowTemplates(true)}
          className="btn btn-ghost"
        >
          📋 Usar plantilla
        </button>
        <button 
          onClick={() => setShowCreateTemplate(true)}
          className="btn btn-outline"
        >
          ✨ Crear plantilla
        </button>
      </div>

      {/* Categorías de checklist */}
      <div className="space-y-4">
        {checklistCategories.map((category) => (
          <div key={category._id} className="card p-4">
            {/* Header de categoría */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleCategoryCollapse(category._id)}
                  className="text-lg hover:bg-gray-100 rounded p-1"
                >
                  {category.isCollapsed ? "▶️" : "🔽"}
                </button>
                
                {editingCategory === category._id ? (
                  <input
                    type="text"
                    value={editingCategoryTitle}
                    onChange={(e) => setEditingCategoryTitle(e.target.value)}
                    onBlur={() => updateCategoryTitle(category._id, editingCategoryTitle)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        updateCategoryTitle(category._id, editingCategoryTitle);
                      }
                    }}
                    className="input text-lg font-semibold"
                    autoFocus
                  />
                ) : (
                  <h3 
                    className="text-lg font-semibold cursor-pointer hover:text-blue-600"
                    onClick={() => {
                      setEditingCategory(category._id);
                      setEditingCategoryTitle(category.title);
                    }}
                  >
                    {category.title}
                  </h3>
                )}
                
                <span className="text-sm text-[color:var(--muted)]">
                  {category.items.filter(item => item.done).length}/{category.items.length}
                </span>
              </div>
              
              <button
                onClick={() => deleteCategory(category._id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Eliminar
              </button>
            </div>

            {/* Items de la categoría */}
            {!category.isCollapsed && (
              <div className="space-y-2">
                {category.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded group">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleItem(category._id, idx)}
                      className="w-4 h-4"
                    />
                    <span className={`flex-1 ${item.done ? "line-through opacity-70" : ""}`}>
                      {item.text}
                    </span>
                    <button
                      onClick={() => deleteItem(category._id, idx)}
                      className="text-red-600 hover:text-red-800 text-sm opacity-0 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                
                {/* Agregar nuevo item */}
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    className="flex-1 input"
                    placeholder="Agregar nueva tarea..."
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        addItemToCategory(category._id);
                      }
                    }}
                  />
                  <button 
                    onClick={() => addItemToCategory(category._id)}
                    className="btn"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {checklistCategories.length === 0 && !hasLegacyChecklist && (
          <div className="text-center py-12 text-[color:var(--muted)]">
            <span className="text-6xl">📋</span>
            <div className="text-lg mt-4">No hay listas de verificación</div>
            <div className="text-sm mt-2">Crea una nueva categoría o usa una plantilla</div>
          </div>
        )}
      </div>

      {/* Modal para agregar categoría */}
      {showAddCategory && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Nueva categoría</h3>
            <input
              type="text"
              value={newCategoryTitle}
              onChange={(e) => setNewCategoryTitle(e.target.value)}
              className="w-full input mb-4"
              placeholder="Ej: Obra Gris, Alambrado..."
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  addCategory();
                }
              }}
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAddCategory(false)}
                className="btn btn-ghost"
              >
                Cancelar
              </button>
              <button
                onClick={addCategory}
                className="btn btn-primary"
                disabled={!newCategoryTitle.trim()}
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para seleccionar plantilla */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Seleccionar plantilla</h3>
              <p className="text-sm text-[color:var(--muted)] mt-1">
                Elige una plantilla predefinida para agregar al proyecto
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {Object.entries(templatesByCategory).map(([categoryName, categoryTemplates]) => (
                <div key={categoryName} className="mb-6">
                  <h4 className="font-medium text-blue-800 mb-3">{categoryName}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryTemplates.map((template) => (
                      <div 
                        key={template._id} 
                        className="border border-[color:var(--border)] rounded-lg p-4 hover:border-blue-300 cursor-pointer"
                        onClick={() => addCategoryFromTemplate(template)}
                      >
                        <h5 className="font-medium mb-2">{template.title}</h5>
                        <p className="text-sm text-[color:var(--muted)] mb-3">
                          {template.description}
                        </p>
                        <div className="text-xs text-blue-600">
                          {template.items.length} tareas incluidas
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-6 border-t">
              <button
                onClick={() => setShowTemplates(false)}
                className="btn btn-ghost"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para crear plantilla */}
      {showCreateTemplate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Crear nueva plantilla</h3>
              <p className="text-sm text-[color:var(--muted)] mt-1">
                Crea tu propia plantilla personalizada para reutilizar en otros proyectos
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Información básica */}
              <div>
                <label className="block text-sm font-medium mb-2">Título de la plantilla *</label>
                <input
                  type="text"
                  value={newTemplate.title}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full input"
                  placeholder="Ej: Instalación Eléctrica, Acabados..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Descripción</label>
                <textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full input h-20 resize-none"
                  placeholder="Describe brevemente para qué sirve esta plantilla..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Categoría</label>
                <input
                  type="text"
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full input"
                  placeholder="Ej: Construcción, Mantenimiento, Inspección..."
                />
              </div>

              {/* Lista de tareas */}
              <div>
                <label className="block text-sm font-medium mb-2">Tareas de la plantilla *</label>
                <div className="space-y-2">
                  {newTemplate.items.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => updateTemplateItem(index, e.target.value)}
                        className="flex-1 input"
                        placeholder={`Tarea ${index + 1}...`}
                      />
                      {newTemplate.items.length > 1 && (
                        <button
                          onClick={() => removeTemplateItem(index)}
                          className="btn btn-ghost text-red-600 hover:text-red-800 px-2"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addTemplateItem}
                    className="btn btn-ghost text-blue-600 hover:text-blue-800"
                  >
                    ➕ Agregar tarea
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCreateTemplate(false);
                  setNewTemplate({
                    title: "",
                    description: "",
                    category: "",
                    items: [""]
                  });
                }}
                className="btn btn-ghost"
              >
                Cancelar
              </button>
              <button
                onClick={createTemplate}
                className="btn btn-primary"
                disabled={!newTemplate.title.trim() || newTemplate.items.filter(item => item.trim()).length === 0}
              >
                Crear plantilla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
