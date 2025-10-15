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

export async function POST(req: Request) {
  try {
    const e = await ensureAdmin();
    if (!e.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: e.status });

    await connectMongo();
    const body = await req.json().catch(() => ({}));
    const invoiceId = body.invoiceId;
    const monto = Number(body.monto) || 0;
    const fecha = body.fecha ? (typeof body.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.fecha) ? new Date(`${body.fecha}T12:00:00Z`) : new Date(body.fecha)) : new Date();
    const metodo = body.metodo || undefined;
    const nota = body.nota || undefined;

    if (!invoiceId) return NextResponse.json({ error: 'invoiceId required' }, { status: 400 });
    if (monto <= 0) return NextResponse.json({ error: 'monto must be > 0' }, { status: 400 });

    // find invoice by _id first, otherwise try facturaId in metadata
    let inv = null;
    try {
      inv = await FinanceEntry.findById(invoiceId);
    } catch (err) {
      inv = null;
    }
    if (!inv) {
      // try lookup by server-generated facturaId
      inv = await FinanceEntry.findOne({ 'metadata.facturaId': invoiceId });
    }
    if (!inv) return NextResponse.json({ error: 'invoice not found' }, { status: 404 });
    if (!inv.metadata || !inv.metadata.invoice) return NextResponse.json({ error: 'target is not an invoice' }, { status: 400 });

    // Determine payment entry tipo: if invoice.tipo === 'INGRESO' then payment is INGRESO (money in), else GASTO
    const paymentTipo = String(inv.tipo || '').toUpperCase() === 'INGRESO' ? 'INGRESO' : 'GASTO';

    // create payment entry
    const payment = await FinanceEntry.create({
      fecha,
      tipo: paymentTipo,
      monto: monto,
      categoria: 'Pago',
      proyectoId: inv.proyectoId || undefined,
      subContratistaId: inv.subContratistaId || undefined,
      nota: nota || `Pago aplicado a factura ${inv.metadata?.factura || invoiceId}`,
      metadata: { payment: true, invoiceId: invoiceId, metodo: metodo, facturaId: inv.metadata?.facturaId }
    });

    // update invoice balance and estado
    const prevBalance = Number(inv.metadata?.balance ?? inv.balance ?? inv.monto ?? 0);
    const newBalance = Math.max(0, prevBalance - monto);
    inv.metadata = { ...(inv.metadata || {}), balance: newBalance } as any;
    if (newBalance <= 0) inv.metadata.estado = 'Pagado';
    else if (newBalance < (inv.monto || 0)) inv.metadata.estado = 'Parcial';
    // append payment reference to invoice metadata for audit
    try {
      const paymentsArr = Array.isArray(inv.metadata?.payments) ? inv.metadata.payments : [];
      paymentsArr.push({ paymentId: payment._id, monto, fecha, metodo });
      inv.metadata.payments = paymentsArr;
    } catch (e) {
      // ignore metadata enrichment errors
    }
    await inv.save();

    return NextResponse.json({ payment, invoice: inv });
  } catch (err: any) {
    console.error('POST /api/finanzas/payments error', err);
    return NextResponse.json({ error: 'Unexpected' }, { status: 500 });
  }
}
