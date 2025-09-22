import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import FinanceEntry from "@/models/FinanceEntry";

export async function GET() {
  try {
    await connectMongo();
    const totalIngresos = await FinanceEntry.aggregate([
      { $match: { tipo: 'INGRESO' } },
      { $group: { _id: null, total: { $sum: '$monto' } } }
    ]);
    const totalGastos = await FinanceEntry.aggregate([
      { $match: { tipo: 'GASTO' } },
      { $group: { _id: null, total: { $sum: '$monto' } } }
    ]);
    return NextResponse.json({ totalIngresos: (totalIngresos[0]?.total) || 0, totalGastos: (totalGastos[0]?.total) || 0 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Unexpected' }, { status: 500 });
  }
}
