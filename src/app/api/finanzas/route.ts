import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import FinanceEntry from "@/models/FinanceEntry";

export async function GET(req: Request) {
  try {
    await connectMongo();
    const url = new URL(req.url);
    const desde = url.searchParams.get("desde");
    const hasta = url.searchParams.get("hasta");
    const categoria = url.searchParams.get("categoria");
    const subContratistaId = url.searchParams.get("subContratistaId");
    const tipo = url.searchParams.get("tipo");

    const q: any = {};
    if (categoria) q.categoria = { $regex: new RegExp(categoria, "i") };
    if (subContratistaId) q.subContratistaId = subContratistaId;
    if (tipo) q.tipo = tipo;
    if (desde || hasta) q.fecha = {};
    if (desde) q.fecha.$gte = new Date(desde);
    if (hasta) q.fecha.$lte = new Date(hasta);

    const entries = await FinanceEntry.find(q).sort({ fecha: -1 }).limit(100).lean();
    return NextResponse.json(entries);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Unexpected' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectMongo();
    const body = await req.json().catch(() => ({}));
    const doc = await FinanceEntry.create({
      fecha: body.fecha ? new Date(body.fecha) : new Date(),
      tipo: body.tipo || 'GASTO',
      monto: Number(body.monto) || 0,
      categoria: body.categoria || '',
      proyectoId: body.proyectoId || undefined,
      subContratistaId: body.subContratistaId || undefined,
      nota: body.nota || undefined,
    });
    return NextResponse.json(doc);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Unexpected' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await connectMongo();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await FinanceEntry.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Unexpected' }, { status: 500 });
  }
}
