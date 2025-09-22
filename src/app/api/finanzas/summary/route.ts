import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import FinanceEntry from "@/models/FinanceEntry";

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

    const desdeRaw = sp.get('desde') || '';
    const hastaRaw = sp.get('hasta') || '';
    const categoria = sp.get('categoria') || undefined;
    const subContratistaId = sp.get('subContratistaId') || undefined;
    const tipo = sp.get('tipo') || undefined;
    const proyectoId = sp.get('proyectoId') || undefined;

    const desde = parseDateParam(desdeRaw, false);
    const hasta = parseDateParam(hastaRaw, true);

    const matchBase: any = {};
    if (categoria) matchBase.categoria = categoria;
    if (subContratistaId) matchBase.subContratistaId = subContratistaId;
    if (proyectoId) matchBase.proyectoId = proyectoId;
    if (desde || hasta) {
      matchBase.fecha = {};
      if (desde) matchBase.fecha.$gte = desde;
      if (hasta) matchBase.fecha.$lte = hasta;
    }

    // Compute totals separately for ingresos and gastos but respecting other filters
    const ingresoMatch = { ...matchBase, tipo: 'INGRESO' };
    const gastoMatch = { ...matchBase, tipo: 'GASTO' };

    const totalIngresosAgg = await FinanceEntry.aggregate([
      { $match: ingresoMatch },
      { $group: { _id: null, total: { $sum: '$monto' } } }
    ]);

    const totalGastosAgg = await FinanceEntry.aggregate([
      { $match: gastoMatch },
      { $group: { _id: null, total: { $sum: '$monto' } } }
    ]);

    const totalIngresos = (totalIngresosAgg[0]?.total) || 0;
    const totalGastos = (totalGastosAgg[0]?.total) || 0;

    return NextResponse.json({ totalIngresos, totalGastos });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Unexpected' }, { status: 500 });
  }
}
