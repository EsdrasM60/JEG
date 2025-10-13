"use client";
import useSWR from 'swr';
import React from 'react';

const fetcher = (u:string) => fetch(u).then(r=>r.ok? r.json(): Promise.reject(r));

export default function FinanzasWidget({ className = '' }: { className?: string }){
  const yearStart = new Date(new Date().getFullYear(),0,1).toISOString().slice(0,10);
  const yearEnd = new Date(new Date().getFullYear(),11,31).toISOString().slice(0,10);
  const { data, error } = useSWR(`/api/finanzas/summary?desde=${yearStart}&hasta=${yearEnd}`, fetcher);
  const ingresos = data?.totalIngresos || 0;
  const gastos = data?.totalGastos || 0;
  const balance = ingresos - gastos;

  return (
    <div className={`p-4 border rounded bg-white/5 ${className}`}>
      <h3 className="text-sm font-medium mb-2">Finanzas - Resumen anual</h3>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs text-muted">Ingresos</div>
          <div className="text-lg font-semibold text-green-600">{new Intl.NumberFormat('en-US',{minimumFractionDigits:2}).format(ingresos)}</div>
        </div>
        <div>
          <div className="text-xs text-muted">Gastos</div>
          <div className="text-lg font-semibold text-red-600">{new Intl.NumberFormat('en-US',{minimumFractionDigits:2}).format(gastos)}</div>
        </div>
        <div>
          <div className="text-xs text-muted">Balance</div>
          <div className="text-lg font-semibold">{new Intl.NumberFormat('en-US',{minimumFractionDigits:2}).format(balance)}</div>
        </div>
      </div>
    </div>
  );
}
