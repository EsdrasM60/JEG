"use client";
import React, { useState } from 'react';

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function BarChart({ data }: { data: Array<{ label: string; ingresos: number; gastos: number }> }) {
  const maxTotal = Math.max(1, ...data.map(d => Math.abs(d.ingresos) + Math.abs(d.gastos)));
  const allZero = data.every(d => (!d.ingresos && !d.gastos));
  const [tooltip, setTooltip] = useState<{ index: number; label: string; type: 'ingresos' | 'gastos'; value: number } | null>(null);
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((maxTotal * i) / tickCount));

  return (
    <div className="w-full relative">
      {allZero ? (
        <div className="w-full h-40 flex items-center justify-center text-sm text-muted">No hay datos para mostrar</div>
      ) : (
        <div className="flex gap-4">
          <div className="flex flex-col items-end pr-3 text-xs text-muted w-16">
            {ticks.slice().reverse().map((t, i) => (
              <div key={i} className="h-8 flex items-center">{formatNumber(t)}</div>
            ))}
          </div>

          <div className="flex-1">
            <div className="relative">
              <div className="flex items-end gap-3 h-56">
                {data.map((d, idx) => {
                  const rawIngresos = Math.abs(d.ingresos);
                  const rawGastos = Math.abs(d.gastos);
                  let ingresosH = Math.round((rawIngresos / maxTotal) * 100);
                  let gastosH = Math.round((rawGastos / maxTotal) * 100);
                  if (rawIngresos > 0 && ingresosH < 3) ingresosH = 3;
                  if (rawGastos > 0 && gastosH < 3) gastosH = 3;
                  const totalH = ingresosH + gastosH;
                  if (totalH > 100) {
                    const scale = 100 / totalH;
                    ingresosH = Math.max(1, Math.round(ingresosH * scale));
                    gastosH = Math.max(1, Math.round(gastosH * scale));
                  }
                  const gastosY = 100 - gastosH;
                  const ingresosY = 100 - gastosH - ingresosH;

                  return (
                    <div key={d.label} className="flex-1 flex flex-col items-center min-w-[40px] relative">
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-40 bg-neutral-100 rounded border overflow-hidden">
                        <rect x="0" y={String(gastosY)} width="100" height={String(gastosH)} fill="#dc2626" onMouseEnter={() => setTooltip({ index: idx, label: d.label, type: 'gastos', value: d.gastos })} onMouseLeave={() => setTooltip(null)} />
                        <rect x="0" y={String(ingresosY)} width="100" height={String(ingresosH)} fill="#16a34a" onMouseEnter={() => setTooltip({ index: idx, label: d.label, type: 'ingresos', value: d.ingresos })} onMouseLeave={() => setTooltip(null)} />
                      </svg>

                      {tooltip && tooltip.index === idx && (
                        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-50 bg-white shadow rounded px-3 py-1 text-sm">
                          <div className="font-medium">{tooltip.label}</div>
                          <div>{tooltip.type === 'ingresos' ? 'Ingresos' : 'Gastos'}: {formatNumber(tooltip.value)}</div>
                        </div>
                      )}

                      <div className="text-xs mt-2 text-center truncate w-full">{d.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-2 text-xs flex justify-between">
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#16a34a] inline-block" /> Ingresos</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#dc2626] inline-block" /> Gastos</div>
      </div>
    </div>
  );
}
