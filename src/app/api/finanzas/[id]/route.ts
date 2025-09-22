import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongo';
import FinanceEntry from '@/models/FinanceEntry';

export async function GET(req: Request) {
  try {
    await connectMongo();
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const doc = await FinanceEntry.findById(id).lean();
    if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(doc);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Unexpected' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await connectMongo();
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const update: any = {};
    if (body.fecha) {
      update.fecha = (typeof body.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.fecha)) ? new Date(`${body.fecha}T12:00:00Z`) : new Date(body.fecha);
    }
    if (body.tipo) update.tipo = body.tipo;
    if (typeof body.monto !== 'undefined') update.monto = Number(body.monto) || 0;
    if (typeof body.categoria !== 'undefined') update.categoria = body.categoria;
    if (typeof body.proyectoId !== 'undefined') update.proyectoId = body.proyectoId || undefined;
    if (typeof body.subContratistaId !== 'undefined') update.subContratistaId = body.subContratistaId || undefined;
    if (typeof body.nota !== 'undefined') update.nota = body.nota;

    const updated = await FinanceEntry.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e: any) {
    console.error('PATCH /api/finanzas/[id] error', e);
    return NextResponse.json({ error: 'Unexpected' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await connectMongo();
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await FinanceEntry.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('DELETE /api/finanzas/[id] error', e);
    return NextResponse.json({ error: 'Unexpected' }, { status: 500 });
  }
}
