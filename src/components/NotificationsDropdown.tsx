"use client";
import React, { useEffect, useState } from "react";

type N = {
  _id: string;
  type: string;
  message: string;
  createdAt: string;
  read?: boolean;
  resolved?: boolean;
};

export default function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<N[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/notifications").then((r) => r.json()).then((j) => {
      if (j.ok) setList(j.data || []);
    }).finally(() => setLoading(false));
  }, [open]);

  const resolve = async (id: string) => {
    await fetch("/api/notifications", { method: "PATCH", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'resolve' }) });
    setList((s) => s.filter(x => x._id !== id));
  };

  return (
    <div className="relative">
      <button title="Notificaciones" aria-label="Notificaciones" onClick={() => setOpen(v => !v)} className="btn ghost">
        🔔 {list.filter(l=>!l.read).length}
      </button>
      {open && (
        <div className="absolute right-0 w-80 bg-white shadow-lg rounded p-2 z-50">
          <div className="text-sm font-bold mb-2">Notificaciones</div>
          {loading && <div>Cargando...</div>}
          {!loading && list.length === 0 && <div className="text-gray-500">Sin notificaciones</div>}
          {!loading && list.map(n => (
            <div key={n._id} className="p-2 border-b">
              <div className="text-sm">{n.message}</div>
              <div className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</div>
              <div className="mt-2 flex gap-2">
                <button className="btn small" onClick={() => window.location.href = '/app/usuarios/admin'}>Ir a usuarios</button>
                <button className="btn small ghost" onClick={() => resolve(n._id)}>Marcar resuelta</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
