"use client";
import useSWR from "swr";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { PLAN_FICHAS, type PlanEntry, type Categoria } from "@/data/fichas-plan";
import { useSession } from "next-auth/react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Programa = {
  _id: string;
  fichaId: any;
  voluntarioId: any;
  asignadoFecha: string;
  completadoFecha?: string | null;
};

type Ficha = { _id?: string; id?: string; titulo: string; };

const CATS: { key: Categoria; title: string; color: string }[] = [
  { key: "EDIFICIO", title: "1-EDIFICIO", color: "#ecb46c" },
  { key: "MECANICOS", title: "2-MECÁNICOS", color: "#84b6f4" },
  { key: "ELECTRICOS", title: "3-ELÉCTRICOS Y ELECTRÓNICOS", color: "#80d1c8" },
  { key: "EQUIPOS", title: "4-EQUIPOS Y HERRAMIENTAS", color: "#c8b4e3" },
];

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export default function TareasCalendarioPage() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [hidden, setHidden] = useState<Record<string, boolean>>({}); // key: titulo
  const [openHidden, setOpenHidden] = useState(false);
  const session = useSession();
  const userKey = (session.data?.user?.email || "anon").toString();
  const storageKey = `calHidden:${userKey}`;

  // Cargar estado de ocultas desde localStorage
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") setHidden(parsed);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Guardar al cambiar
  useEffect(() => {
    try {
      if (typeof window !== "undefined") localStorage.setItem(storageKey, JSON.stringify(hidden));
    } catch {}
  }, [hidden, storageKey]);

  const { data: programasResp } = useSWR<{ items: Programa[] }>(`/api/tareas/programa?page=1&pageSize=10000&year=${year}` , fetcher);
  const { data: fichasResp } = useSWR<{ items: Ficha[] }>(`/api/tareas/fichas?page=1&pageSize=10000&sort=alpha`, fetcher);

  const programas = useMemo(() => (programasResp?.items || []) as Programa[], [programasResp]);
  const fichas = useMemo(() => (fichasResp?.items || []) as Ficha[], [fichasResp]);

  // Índice de programas por ficha y mes y asignados
  const progIndex = useMemo(() => {
    const map = new Map<string, { months: Set<number>; byMonth: Map<number, string[]> }>();
    for (const p of programas) {
      const fid = p.fichaId?._id || p.fichaId?.id || "";
      if (!fid) continue;
      const d = new Date(p.completadoFecha || p.asignadoFecha);
      if (isNaN(d as any) || d.getFullYear() !== year) continue;
      const m = d.getMonth() + 1; // 1..12
      const key = String(fid);
      if (!map.has(key)) map.set(key, { months: new Set(), byMonth: new Map() });
      const entry = map.get(key)!;
      entry.months.add(m);
      const idStr = p.voluntarioId?.shortId ? String(p.voluntarioId.shortId) : (p.voluntarioId?._id || p.voluntarioId?.id || "");
      const arr = entry.byMonth.get(m) || [];
      arr.push(idStr);
      entry.byMonth.set(m, arr);
    }
    return map;
  }, [programas, year]);

  function hasFicha(title: string): { id?: string } {
    const f = fichas.find((x) => (x.titulo || "").trim().toLowerCase() === title.trim().toLowerCase());
    return { id: (f?._id || (f as any)?.id) as string | undefined };
  }

  function Cell({ planned, done }: { planned: boolean; done: boolean }) {
    const bg = done ? "bg-green-400" : planned ? "bg-neutral-400" : "";
    return <td className={`h-6 min-w-8 border ${bg}`} />;
  }

  function Section({ cat }: { cat: typeof CATS[number] }) {
    const rows = PLAN_FICHAS.filter((e) => e.categoria === cat.key).filter((r) => !hidden[r.titulo]);
    return (
      <div className="border rounded overflow-hidden">
        <div className="px-3 py-2 text-white font-semibold flex items-center gap-3" style={{ backgroundColor: cat.color }}>
          <span>{cat.title}</span>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-[11px] sm:text-xs min-w-[720px]">
            <thead>
              <tr className="bg-neutral-100">
                <th className="text-left px-2 py-2 w-[180px] sm:w-[220px]">Fichas</th>
                <th className="text-left px-2 py-2 w-[80px] sm:w-[100px]">Frecuencia</th>
                {MESES.map((m) => (
                  <th key={m} className="px-1 py-2 text-center w-8 sm:w-10">{m}</th>
                ))}
                <th className="text-left px-2 py-2 w-[160px] sm:w-[200px]">Asignado(s)</th>
                <th className="w-[50px] sm:w-[60px]"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const { id } = hasFicha(r.titulo);
                return (
                  <tr key={r.titulo} className="border-t">
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <span>{r.titulo}{r.starred ? "*" : ""}</span>
                        {id ? (
                          <Link href={`/api/tareas/fichas/file/${id}`} className="text-blue-700 underline text-[11px] ml-2" target="_blank" rel="noreferrer">
                            ficha
                          </Link>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-2">{r.frecuencia}</td>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                      const planned = r.meses.includes(month);
                      const done = id ? (progIndex.get(String(id))?.months.has(month) ?? false) : false;
                      return <Cell key={month} planned={planned} done={done} />;
                    })}
                    <td className="px-2 py-2 text-[11px] text-neutral-700">
                      {id ? (
                        <div className="grid grid-cols-12 gap-1">
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                            const ids = progIndex.get(String(id))?.byMonth.get(month) || [];
                            return <div key={month} className="text-center">{ids.join(", ")}</div>;
                          })}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button className="text-xs underline" onClick={() => setHidden((h) => ({ ...h, [r.titulo]: true }))}>Ocultar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const ocultas = Object.entries(hidden).filter(([, v]) => v).map(([k]) => k);

  return (
    <section className="space-y-6">
      {/* Header con tabs y controles */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2 text-sm overflow-x-auto whitespace-nowrap -mx-1 px-1">
            <Link href="/tareas" className="px-3 py-1 rounded border">Programa</Link>
            <Link href="/tareas/fichas" className="px-3 py-1 rounded border">Fichas</Link>
            <span className="px-3 py-1 rounded border bg-neutral-100">Calendario</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="border rounded px-2 py-1" onClick={() => setYear((y) => y - 1)}>◀</button>
            <div className="font-medium">{year}</div>
            <button className="border rounded px-2 py-1" onClick={() => setYear((y) => y + 1)}>▶</button>
            {ocultas.length ? (
              <div className="relative">
                <button className="border rounded px-2 py-1" onClick={() => setOpenHidden((v) => !v)}>
                  Fichas ocultas ({ocultas.length})
                </button>
                {openHidden ? (
                  <div className="absolute right-0 mt-1 w-64 max-h-60 overflow-auto bg-white border rounded shadow z-10 p-1">
                    {ocultas.map((t) => (
                      <button key={t} className="w-full text-left px-2 py-1 hover:bg-neutral-100 rounded" onClick={() => { setHidden((h) => ({ ...h, [t]: false })); setOpenHidden(false); }}>
                        {t} · mostrar
                      </button>
                    ))}
                    <div className="border-t my-1" />
                    <button className="w-full text-left px-2 py-1 hover:bg-neutral-100 rounded" onClick={() => { setHidden({}); setOpenHidden(false); }}>
                      Mostrar todas
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <h1 className="text-2xl font-bold">Calendario anual de fichas</h1>
      <p className="text-sm text-neutral-600">Gris: planificado · Verde: completado · Asignado(s): IDs por mes</p>

      {CATS.map((c) => (
        <Section key={c.key} cat={c} />
      ))}
    </section>
  );
}
