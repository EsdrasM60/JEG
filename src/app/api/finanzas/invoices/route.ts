import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongo';
import FinanceEntry from '@/models/FinanceEntry';
import { auth, role as RoleEnum } from '@/lib/auth';

async function ensureAdmin() {
  const session = await auth();
  if (!session) return { ok: false, status: 401 };
  const r = (session.user as any)?.role as string | undefined;
  if (r !== RoleEnum.ADMIN) return { ok: false, status: 403 };
  return { ok: true };
}

function parseDateParam(value?: string) {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00Z`);
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

export async function GET(req: Request) {
  try {
    const e = await ensureAdmin();
    if (!e.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: e.status });

    await connectMongo();
    const url = new URL(req.url);
    const sp = url.searchParams;
    const desde = parseDateParam(sp.get('desde') || undefined);
    const hasta = parseDateParam(sp.get('hasta') || undefined);
    const clienteId = sp.get('clienteId') || undefined;
    const proveedorId = sp.get('proveedorId') || undefined;
    const estado = sp.get('estado') || undefined;
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);
    const pageSize = Math.min(1000, Math.max(1, parseInt(sp.get('pageSize') || '25', 10) || 25));

    const match: any = { 'metadata.invoice': true };
    if (clienteId) match['metadata.clienteId'] = clienteId;
    if (proveedorId) match['metadata.proveedorId'] = proveedorId;
    if (estado) match['metadata.estado'] = estado;
    if (desde || hasta) {
      match.fecha = {};
      if (desde) match.fecha.$gte = desde;
      if (hasta) match.fecha.$lte = hasta;
    }

    const total = await FinanceEntry.countDocuments(match);
    const skip = (page - 1) * pageSize;
    const items = await FinanceEntry.find(match).sort({ fecha: -1 }).skip(skip).limit(pageSize).lean();

    return NextResponse.json({ items, total, page, pageSize });
  } catch (err: any) {
    console.error('GET /api/finanzas/invoices error', err);
    return NextResponse.json({ error: 'Unexpected' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const e = await ensureAdmin();
    if (!e.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: e.status });

    await connectMongo();
    const body = await req.json().catch(() => ({}));

    const fecha = body.fecha ? (typeof body.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.fecha) ? new Date(`${body.fecha}T12:00:00Z`) : new Date(body.fecha)) : new Date();

    // Decide side: purchase if proveedorId present, otherwise sale
    const isCompra = !!body.proveedorId;
    const tipoFinal = isCompra ? 'GASTO' : 'INGRESO';

    const montoSin = Number(body.montoSinItbis) || 0;
    const itbis = Number(body.itbis) || 0;
    const totalAmount = Number(body.totalAmount ?? body.monto ?? (montoSin + itbis)) || montoSin + itbis;

    const invoiceTipo = String((body.invoiceTipo || body.invoiceType || '').toString()).toUpperCase() === 'CONTADO' ? 'CONTADO' : 'CREDITO';

    const metadata: any = {
      invoice: true,
      invoiceTipo,
      factura: body.factura || undefined,
      diasCredito: typeof body.diasCredito !== 'undefined' ? Number(body.diasCredito) : undefined,
      clienteId: body.clienteId || undefined,
      clienteLabel: body.cliente || undefined,
      proveedorId: body.proveedorId || undefined,
      proveedorLabel: body.proveedor || undefined,
      montoSinItbis: montoSin || undefined,
      itbis: itbis || undefined,
    };

    // Generate or preserve an internal facturaId on the server. This is different from the
    // human-readable `factura` field and will be used to link payments and reconciliations.
    const generatedFacturaId = body.facturaId || (body.metadata && body.metadata.facturaId) ||
      (typeof globalThis !== 'undefined' && (globalThis as any).crypto && (globalThis as any).crypto.randomUUID ? (globalThis as any).crypto.randomUUID() : `f-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
    metadata.facturaId = generatedFacturaId;

    if (invoiceTipo === 'CREDITO') {
      metadata.balance = totalAmount;
      metadata.estado = 'Pendiente';
    } else {
      metadata.balance = 0;
      metadata.estado = 'Pagado';
    }

    // keep existing nonCxP marker if provided
    if (body.metadata && body.metadata.nonCxP) metadata.nonCxP = true;

    const doc = await FinanceEntry.create({
      fecha,
      tipo: tipoFinal,
      monto: totalAmount,
      categoria: body.categoria || (isCompra ? 'CxP' : 'CxC'),
      proyectoId: body.proyectoId || undefined,
      subContratistaId: body.subContratistaId || undefined,
      nota: body.nota || undefined,
      metadata
    });

    return NextResponse.json(doc);
  } catch (err: any) {
    console.error('POST /api/finanzas/invoices error', err);
    return NextResponse.json({ error: 'Unexpected' }, { status: 500 });
  }
}
