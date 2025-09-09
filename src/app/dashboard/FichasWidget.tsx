"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

type Ficha = {
  id: string;
  titulo: string;
  asignado_a?: string | null;
  estado?: string | null;
  vencimiento?: string | null;
  createdAt?: string | null;
};

export default function FichasWidget({ items, isAdmin, userEmail, userName }: { items: Ficha[]; isAdmin: boolean; userEmail?: string; userName?: string }) {
  const [estado, setEstado] = useState<"ABIERTAS" | "TODAS">("ABIERTAS");
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");

  function parseDate(s?: string | null) {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  const filtradas = useMemo(() => {
    const uEmail = (userEmail || "").toLowerCase();
    const uName = (userName || "").toLowerCase();
    const dDesde = parseDate(desde);
    const dHasta = parseDate(hasta);

    return items.filter((f) => {
      const abierta = (f.estado || "ABIERTA") !== "COMPLETADA"; // ABIERTA o EN_PROGRESO
      const asignada = (f.asignado_a ?? "").trim().length > 0;
      if (!asignada) return false; // solo asignadas
      if (estado === "ABIERTAS" && !abierta) return false;

      if (!isAdmin) {
        const a = (f.asignado_a || "").toLowerCase();
        const esMio = a === uEmail || (!!uName && a.includes(uName));
        if (!esMio) return false;
      }

      // Rango de fechas por vencimiento (o createdAt si no hay vencimiento)
      const base = parseDate(f.vencimiento) || parseDate(f.createdAt);
      if (dDesde && base && base < dDesde) return false;
      if (dHasta && base && base > dHasta) return false;
      return true;
    });
  }, [items, estado, desde, hasta, isAdmin, userEmail, userName]);

  return (
    <div className="rounded-lg border">
      <div className="px-4 py-3 border-b flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Fichas asignadas</h2>
          <div className="text-sm text-neutral-600">{filtradas.length}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1">
            <span>Estado</span>
            <select className="border rounded px-2 py-1" value={estado} onChange={(e)=>setEstado(e.target.value as any)}>
              <option value="ABIERTAS">Abiertas</option>
              <option value="TODAS">Todas</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span>Desde</span>
            <input type="date" className="border rounded px-2 py-1" value={desde} onChange={(e)=>setDesde(e.target.value)} />
          </label>
          <label className="flex items-center gap-1">
            <span>Hasta</span>
            <input type="date" className="border rounded px-2 py-1" value={hasta} onChange={(e)=>setHasta(e.target.value)} />
          </label>
          <Link href="/tareas/fichas" className="ml-auto underline">Ver fichas</Link>
        </div>
      </div>
      {filtradas.length === 0 ? (
        <div className="p-4 text-sm text-neutral-600">Sin resultados.</div>
      ) : (
        <ul className="divide-y">
          {filtradas.map((f) => (
            <li key={f.id} className="px-4 py-3 flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-medium truncate">{f.titulo}</div>
                <div className="text-xs text-neutral-600 truncate">Asignado a: {f.asignado_a}</div>
              </div>
              <div className="text-right text-sm text-neutral-700">
                {f.vencimiento ? (
                  <div>Vence: {new Date(f.vencimiento).toLocaleDateString()}</div>
                ) : (
                  <div className="text-neutral-500">Sin vencimiento</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
