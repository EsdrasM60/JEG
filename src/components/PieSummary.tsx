"use client";
import React from 'react';

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function PieSummary({ ingresos = 0, gastos = 0 }: { ingresos?: number; gastos?: number }) {
  const total = ingresos + gastos;
  const ingresosPct = total === 0 ? 0 : (ingresos / total) * 100;
  const gastosPct = total === 0 ? 0 : (gastos / total) * 100;
  const size = 80;
  const stroke = 40;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const ingresosDash = (ingresosPct / 100) * circ;

  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`translate(${size/2},${size/2})`}>
          <circle r={radius} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
          <circle
            r={radius}
            fill="none"
            stroke="#16a34a"
            strokeWidth={stroke}
            strokeDasharray={`${ingresosDash} ${Math.max(0, circ - ingresosDash)}`}
            transform={`rotate(-90)`}
            strokeLinecap="round"
          />
          <circle
            r={radius}
            fill="none"
            stroke="#dc2626"
            strokeWidth={stroke}
            strokeDasharray={`${Math.max(0, circ - ingresosDash)} ${ingresosDash}`}
            transform={`rotate(${ -90 + (ingresosPct/100)*360 })`}
            strokeLinecap="round"
          />
        </g>
      </svg>
      <div>
        <div className="text-sm text-muted">Ingresos: <strong>{formatNumber(ingresos)}</strong></div>
        <div className="text-sm text-muted">Gastos: <strong>{formatNumber(gastos)}</strong></div>
        <div className="text-sm">Balance: <strong>{formatNumber(ingresos - gastos)}</strong></div>
      </div>
    </div>
  );
}
