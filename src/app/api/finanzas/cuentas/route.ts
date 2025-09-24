import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import FinanceEntry from "@/models/FinanceEntry";

// Simple combined endpoint that returns both CxC and CxP summaries for a date range / filters
function parseDateParam(value?: string, endOfDay = false) {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}Z`);
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

export async function GET(req: Request) {
  try {
    await connectMongo();
    const url = new URL(req.url);
    const sp = url.searchParams;
    const desde = parseDateParam(sp.get('desde') || undefined, false);
    const hasta = parseDateParam(sp.get('hasta') || undefined, true);
    const categoria = sp.get('categoria') || undefined;
    const subContratistaId = sp.get('subContratistaId') || undefined;
    const proyectoId = sp.get('proyectoId') || undefined;

    const baseMatch: any = {};
    if (categoria) baseMatch.categoria = categoria;
    if (subContratistaId) baseMatch.subContratistaId = subContratistaId;
    if (proyectoId) baseMatch.proyectoId = proyectoId;
    if (desde || hasta) {
      baseMatch.fecha = {};
      if (desde) baseMatch.fecha.$gte = desde;
      if (hasta) baseMatch.fecha.$lte = hasta;
    }

    const ingresoMatch = { ...baseMatch, tipo: 'INGRESO' };
    const gastoMatch = { ...baseMatch, tipo: 'GASTO' };

    const [cxcAgg, cxpAgg] = await Promise.all([
      FinanceEntry.aggregate([
        { $match: ingresoMatch },
        { $group: { _id: null, total: { $sum: '$monto' } } }
      ]),
      FinanceEntry.aggregate([
        { $match: gastoMatch },
        { $group: { _id: null, total: { $sum: '$monto' } } }
      ])
    ]);

    const totalIngresos = cxcAgg[0]?.total || 0;
    const totalGastos = cxpAgg[0]?.total || 0;

    return NextResponse.json({ totalIngresos, totalGastos });
  } catch (err: any) {
    console.error('GET /api/finanzas/cuentas error', err);
    return NextResponse.json({ error: 'Unexpected' }, { status: 500 });
  }
}
