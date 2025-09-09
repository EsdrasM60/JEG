'use client';

import { useEffect, useMemo, useState } from 'react';
import { PLAN_SEMANAL } from '@/data/plan-semanal';

// Tipos mínimos para el documento
type Asignacion = {
	slot: number; // semana del mes 1..5
	plantilla?: number; // plantilla 1..5 (guía)
	empresa?: string;
	year: number;
	month: number;
	completado: boolean;
	notas?: string;
	tareas?: string[]; // áreas elegidas
};

type PlanDoc = {
	year: number;
	month: number;
	empresas: string[];
	asignaciones: Asignacion[];
};

const MESES = [
	'Enero',
	'Febrero',
	'Marzo',
	'Abril',
	'Mayo',
	'Junio',
	'Julio',
	'Agosto',
	'Sptiembre',
	'Octubre',
	'Noviembre',
	'Diciembre',
];

export default function PlanSemanalPage() {
	const now = useMemo(() => new Date(), []);
	const [year, setYear] = useState<number>(now.getFullYear());
	const [month, setMonth] = useState<number>(now.getMonth() + 1); // 1..12
	const [doc, setDoc] = useState<PlanDoc | null>(null);
	const [congs, setCongs] = useState<string[]>([]); // kept for compatibility
	const [empresas, setEmpresas] = useState<string[]>([]);
	const [loading, setLoading] = useState(false);
	const [savingCong, setSavingCong] = useState(false);
	const [newCong, setNewCong] = useState('');
	const [message, setMessage] = useState<string>('');

	useEffect(() => {
		let ignore = false;
		const load = async () => {
			setLoading(true);
			try {
				const res = await fetch(
					`/api/plan-semanal?year=${year}&month=${month}`,
					{ cache: 'no-store' }
				);
				const data = await res.json();
				if (!ignore) {
					if (res.ok && data.item) setDoc(data.item);
					else setDoc({ year, month, empresas: [], asignaciones: [] });
				}
			} catch (e) {
				if (!ignore) setDoc({ year, month, empresas: [], asignaciones: [] });
			} finally {
				if (!ignore) setLoading(false);
			}
		};
		load();
		return () => {
			ignore = true;
		};
	}, [year, month]);

	useEffect(() => {
		let ignore = false;
		const loadC = async () => {
			try {
				// prefer /api/config/empresas, fallback to congregaciones
				const r = await fetch('/api/config/empresas/from-voluntarios', { cache: 'no-store' });
				if (!r.ok) {
					const r2 = await fetch('/api/config/congregaciones/from-voluntarios', { cache: 'no-store' });
					const j2 = await r2.json();
					if (!ignore) { setCongs(j2.congregaciones || []); setEmpresas(j2.congregaciones || []); }
					return;
				}
				const j = await r.json();
				if (!ignore) setEmpresas(j.empresas || j.congregaciones || []);
			} catch (e) {}
		};
		loadC();
		return () => { ignore = true; };
	}, []);

	const asignacionPorSlot = useMemo(() => {
		const map = new Map<number, Asignacion>();
		doc?.asignaciones?.forEach((a: any) => {
			if (typeof a.slot === 'number') map.set(a.slot, a as Asignacion);
		});
		return map;
	}, [doc]);

	const defaultTareas = (plantilla?: number) => {
		if (!plantilla) return [] as string[];
		const tpl = PLAN_SEMANAL.find((p) => p.semana === plantilla);
		return (tpl?.tareas || []).map((t) => t.area);
	};

	const showMsg = (t: string) => {
		setMessage(t);
		setTimeout(() => setMessage(''), 2000);
	};

	const upsertSlot = async (slot: number, payload: Partial<Asignacion>) => {
		if (!doc) return;
		const existing = asignacionPorSlot.get(slot);
		if (existing) {
			const res = await fetch('/api/plan-semanal/asignar', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ year, month, slot, ...payload }),
			});
			const data = await res.json();
			setDoc(data.item);
			showMsg('Guardado');
		} else {
			const res = await fetch('/api/plan-semanal/asignar', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ year, month, slot, ...payload }),
			});
			const data = await res.json();
			setDoc(data.item);
			showMsg('Asignado');
		}
	};

	const saveCongregaciones = async (list: string[]) => {
		setSavingCong(true);
		try {
			// prefer new endpoint
			const res = await fetch('/api/config/empresas', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ empresas: list }),
			});
			if (!res.ok) {
				const res2 = await fetch('/api/config/congregaciones', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ congregaciones: list }),
				});
				const data2 = await res2.json();
				setEmpresas(data2.empresas || data2.congregaciones || []);
				setCongs(data2.congregaciones || []);
				showMsg('Empresas guardadas');
				return;
			}
			const data = await res.json();
			setEmpresas(data.empresas || []);
			setCongs(data.empresas || []);
			showMsg('Empresas guardadas');
		} finally {
			setSavingCong(false);
		}
	};

	const removeCong = (name: string) => {
		const next = empresas.filter((c) => c !== name);
		saveCongregaciones(next);
	};

	const addCong = () => {
		const name = newCong.trim();
		if (!name) return;
		if ((empresas || []).includes(name)) {
			setNewCong('');
			return;
		}
		saveCongregaciones([...(empresas || []), name]);
		setNewCong('');
	};

	const years = useMemo(() => {
		const y = now.getFullYear();
		return [y - 1, y, y + 1];
	}, [now]);

	return (
		<section className="space-y-6">
			<div className="flex items-center justify-between flex-wrap gap-4">
				<div>
					<h1 className="text-2xl font-bold">Plan semanal</h1>
					<p className="text-sm text-[color:var(--muted)]">Asignaciones por semana.</p>
				</div>
				<div className="flex items-center gap-2">
					<select className="select" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
						{([now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1] as number[]).map((y) => (
							<option key={y} value={y}>{y}</option>
						))}
					</select>
					<select className="select" value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
						{['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Sptiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
							<option key={m} value={i + 1}>{m}</option>
						))}
					</select>
				</div>
			</div>

			{message && <div className="text-xs" style={{ color: 'var(--success)' }}>{message}</div>}

			<div className="space-y-2">
				<h2 className="font-medium">Empresas</h2>
				<div className="flex gap-2 flex-wrap items-center">
					<input className="input" placeholder="Nueva empresa" value={newCong} onChange={(e) => setNewCong(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addCong(); }} />
					<button className="btn btn-primary disabled:opacity-50" onClick={addCong} disabled={savingCong || !newCong.trim()}>Agregar</button>
					{savingCong && <span className="text-xs text-[color:var(--muted)]">Guardando…</span>}
				</div>
				<div className="flex gap-2 flex-wrap">
					{(empresas || []).map((c) => (
						<span key={c} className="inline-flex items-center gap-2 badge">
							{c}
							<button className="text-red-500 text-xs hover:underline" onClick={() => removeCong(c)} title="Quitar">×</button>
						</span>
					))}
					{(empresas || []).length === 0 && (
						<span className="text-xs text-[color:var(--muted)]">Aún no hay empresas</span>
					)}
				</div>
			</div>

			<div className="space-y-6">
				{[1, 2, 3, 4, 5].map((slot) => {
					const asign = asignacionPorSlot.get(slot);
					const plantilla = asign?.plantilla;
					const tpl = plantilla ? PLAN_SEMANAL.find((p) => p.semana === plantilla) : undefined;
					const tareasElegidas = asign?.tareas || [];
					const puedeCompletar = !!(plantilla && asign?.empresa && (tareasElegidas?.length || 0) > 0);
					return (
						<div key={slot} className="card p-4">
							<div className="flex items-center justify-between gap-3 flex-wrap">
								<div>
									<h3 className="font-semibold">Semana {slot} del mes</h3>
									{tpl ? (
										<p className="text-xs text-[color:var(--muted)]">Plantilla: {tpl.titulo}</p>
									) : (
										<p className="text-xs text-[color:var(--muted)]">Selecciona la semana de la guía para esta semana del mes</p>
									)}
								</div>
								<div className="flex items-center gap-3 flex-wrap">
									<select className="select" value={plantilla || ''} onChange={async (e) => { const p = parseInt(e.target.value); if (!p) return; await upsertSlot(slot, { plantilla: p, tareas: defaultTareas(p) }); }}>
										<option value="">Semana de guía…</option>
										{PLAN_SEMANAL.map((p) => (<option key={p.semana} value={p.semana}>{p.titulo}</option>))}
									</select>

									<select className="select disabled:opacity-60" disabled={!plantilla} value={asign?.empresa || ''} onChange={async (e) => { const v = e.target.value; if (!v) return; await upsertSlot(slot, { empresa: v }); }}>
										<option value="">Asignar empresa…</option>
										{(empresas || []).map((c) => (<option key={c} value={c}>{c}</option>))}
									</select>

									<label className="inline-flex items-center gap-2 text-sm">
										<input type="checkbox" checked={!!asign?.completado} disabled={!puedeCompletar} title={!puedeCompletar ? 'Selecciona plantilla, empresa y tareas' : 'Marcar completado'} onChange={async (e) => { await upsertSlot(slot, { completado: e.target.checked }); }} />
										Completado
									</label>
								</div>
							</div>

							{tpl && (
								<div className="mt-3 space-y-3">
									<div className="text-sm font-medium">Áreas a realizar</div>
									<div className="grid sm:grid-cols-2 gap-2 text-sm">
										{tpl.tareas.map((t) => {
											const checked = tareasElegidas.includes(t.area);
											return (
												<label key={t.area} className="flex items-start gap-2 rounded px-3 py-2 bg-[color:var(--surface-2)] border border-[color:var(--border)]">
												<input type="checkbox" className="mt-1" disabled={!asign?.empresa} checked={checked} onChange={async (e) => { const next = new Set(tareasElegidas); if (e.target.checked) next.add(t.area); else next.delete(t.area); await upsertSlot(slot, { tareas: Array.from(next) }); }} />
											<div>
												<div className="font-medium text-[color:var(--foreground)]">{t.area}</div>
												<div className="text-xs text-[color:var(--muted)] leading-relaxed">{t.descripcion}</div>
											</div>
											</label>
										);
										})}
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>

			{loading && <p className="text-sm text-[color:var(--muted)]">Cargando…</p>}
		</section>
	);
}
