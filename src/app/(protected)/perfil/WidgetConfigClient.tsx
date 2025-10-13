"use client";
import React, { useEffect, useState } from "react";

const AVAILABLE_WIDGETS = [
  { key: "dashboard:programas", label: "Programas pendientes" },
  { key: "dashboard:proyectos", label: "Proyectos" },
  { key: "dashboard:finanzas", label: "Finanzas (Resumen)" },
];

export default function WidgetConfigClient({ initialWidgets = [] }: { initialWidgets?: string[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!initialWidgets || initialWidgets.length === 0) setSelected([]);
    else setSelected(Array.from(initialWidgets));
  }, [initialWidgets]);

  const isSelected = (k: string) => selected.includes(k);

  const toggle = (k: string) => {
    setSelected((s) => {
      const copy = Array.from(s);
      const idx = copy.indexOf(k);
      if (idx >= 0) copy.splice(idx, 1);
      else copy.push(k);
      return copy;
    });
  };

  const move = (index: number, dir: "up" | "down") => {
    setSelected((s) => {
      const copy = Array.from(s);
      const to = dir === "up" ? index - 1 : index + 1;
      if (to < 0 || to >= copy.length) return copy;
      const tmp = copy[to];
      copy[to] = copy[index];
      copy[index] = tmp;
      return copy;
    });
  };

  const remove = (k: string) => setSelected((s) => s.filter((x) => x !== k));

  const clear = () => {
    setSelected([]);
    setMessage("Ajustes limpiados. Guardar para aplicar.");
    setTimeout(() => setMessage(null), 1500);
  };

  const save = async () => {
    setSaving(true);
    try {
      const widgetsStr = Array.from(selected).join(",");
      const fd = new FormData();
      fd.set("widgets", widgetsStr);
      const res = await fetch("/api/user/settings", { method: "POST", body: fd });
      if (!res.ok) throw new Error("save failed");
      setMessage("Guardado");
      setTimeout(() => { window.location.reload(); }, 700);
    } catch (e) {
      console.error(e);
      setMessage("Error al guardar");
      setTimeout(() => setMessage(null), 1200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-3 border rounded mb-4 bg-[color:var(--surface)]">
      <div className="flex items-center justify-between mb-2">
        <strong>Widgets visibles</strong>
        <div className="text-sm text-[color:var(--muted)]">Vacío = ver por defecto (asignado)</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        {AVAILABLE_WIDGETS.map((w) => (
          <label key={w.key} className="inline-flex items-center gap-2">
            <input type="checkbox" checked={isSelected(w.key)} onChange={() => toggle(w.key)} />
            <span className="text-sm">{w.label}</span>
          </label>
        ))}
      </div>

      <div className="mb-3">
        <div className="text-sm font-medium mb-1">Orden seleccionado</div>
        {selected.length === 0 && <div className="text-sm text-[color:var(--muted)]">(Vacío — se mostrará el comportamiento por defecto)</div>}
        <ul className="space-y-1 mt-2">
          {selected.map((k, idx) => {
            const label = AVAILABLE_WIDGETS.find((w) => w.key === k)?.label || k;
            return (
              <li key={k} className="flex items-center justify-between gap-2 p-2 border rounded bg-[color:var(--surface-2)]">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn btn-ghost" title="Subir" onClick={() => move(idx, "up")} disabled={idx === 0}>▲</button>
                  <button type="button" className="btn btn-ghost" title="Bajar" onClick={() => move(idx, "down")} disabled={idx === selected.length - 1}>▼</button>
                  <button type="button" className="btn btn-ghost text-red-400" title="Eliminar" onClick={() => remove(k)}>✕</button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex gap-2">
        <button type="button" className="btn" onClick={clear}>Limpiar</button>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Guardando...' : 'Guardar'}</button>
        {message && <div className="text-sm text-[color:var(--muted)] ml-2">{message}</div>}
      </div>
    </div>
  );
}
