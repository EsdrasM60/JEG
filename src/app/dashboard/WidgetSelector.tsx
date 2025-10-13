"use client";
import React, { useEffect, useState } from 'react';

type Props = {
  initialWidgets: string[] | null;
  initialTheme?: string;
};

const AVAILABLE_WIDGETS = [
  { key: 'dashboard:programas', label: 'Programas pendientes' },
  { key: 'dashboard:proyectos', label: 'Proyectos' },
  { key: 'dashboard:finanzas', label: 'Finanzas (Resumen)' },
];

export default function WidgetSelector({ initialWidgets, initialTheme }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!initialWidgets || initialWidgets.length === 0) {
      // empty means user wants default behaviour (show everything assigned) - represent as empty set
      setSelected(new Set());
    } else {
      setSelected(new Set(initialWidgets));
    }
  }, [initialWidgets]);

  const toggle = (k: string) => {
    setSelected((s) => {
      const copy = new Set(Array.from(s));
      if (copy.has(k)) copy.delete(k);
      else copy.add(k);
      return copy;
    });
  };

  const clear = async () => {
    setSelected(new Set());
    setMessage('Ajustes limpiados. Guardar para aplicar.');
    setTimeout(() => setMessage(null), 2000);
  };

  const save = async () => {
    setSaving(true);
    try {
      const widgetsStr = Array.from(selected).join(',');
      const fd = new FormData();
      // send theme along so we don't overwrite it unintentionally
      fd.set('theme', initialTheme || 'system');
      fd.set('widgets', widgetsStr);
      const res = await fetch('/api/user/settings', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('save failed');
      setMessage('Guardado');
      // reload to reflect server-side changes in dashboard
      setTimeout(() => { window.location.reload(); }, 700);
    } catch (e) {
      console.error(e);
      setMessage('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-3 border rounded mb-4 bg-white/5">
      <div className="flex items-center justify-between mb-2">
        <strong>Configurar widgets</strong>
        <div className="text-sm text-muted">Mostrar solo los widgets seleccionados (vacío = por defecto)</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        {AVAILABLE_WIDGETS.map((w) => (
          <label key={w.key} className="inline-flex items-center gap-2">
            <input type="checkbox" checked={selected.has(w.key)} onChange={() => toggle(w.key)} />
            <span className="text-sm">{w.label}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn" onClick={clear}>Limpiar</button>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Guardando...' : 'Guardar'}</button>
        {message && <div className="text-sm text-muted ml-2">{message}</div>}
      </div>
    </div>
  );
}
