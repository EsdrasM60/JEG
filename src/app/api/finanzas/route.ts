import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import FinanceEntry from "@/models/FinanceEntry";
import { auth, role as RoleEnum } from "@/lib/auth";

async function ensureAdmin() {
  const session = await auth();
  if (!session) return { ok: false, status: 401 };
  const r = (session.user as any)?.role as string | undefined;
  if (r !== RoleEnum.ADMIN) return { ok: false, status: 403 };
  return { ok: true };
}

const _norm = (v: any) => (v === undefined || v === null) ? '' : String(v).toLowerCase();
const isExcludedCategory = (v: any) => {
  const s = _norm(v);
  if (!s) return false;
  return s.includes('mano') || s.includes('gastos') || s.includes('indirect');
};
const canonicalCategory = (v: any) => {
  const s = _norm(v);
  if (s.includes('mano')) return 'Mano de Obra';
  if (s.includes('gastos')) return 'Gastos Adm';
  if (s.includes('indirect')) return 'Indirectos';
  return typeof v === 'string' ? v : '';
};

function parseDateParam(value?: string, endOfDay = false) {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    // Interpret date-only strings in America/Santo_Domingo (UTC-04:00) to avoid timezone rollover
    return new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}-04:00`);
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

export async function GET(req: Request) {
  try {
    const e = await ensureAdmin();
    if (!e.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: e.status });

    await connectMongo();
    const url = new URL(req.url);
    const desde = url.searchParams.get("desde");
    const hasta = url.searchParams.get("hasta");
    const categoria = url.searchParams.get("categoria");
    const subContratistaId = url.searchParams.get("subContratistaId");
    const tipo = url.searchParams.get("tipo");
    const proyectoId = url.searchParams.get("proyectoId");
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(1000, Math.max(1, parseInt(url.searchParams.get('pageSize') || '25', 10) || 25));

    const q: any = {};
    if (categoria) q.categoria = { $regex: new RegExp(categoria, "i") };
    if (subContratistaId) q.subContratistaId = subContratistaId;
    if (proyectoId) q.proyectoId = proyectoId;
    if (tipo) q.tipo = tipo;
    if (desde || hasta) q.fecha = {};
    // treat date-only params (YYYY-MM-DD) as full-day ranges in UTC
    if (desde) {
      const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(desde);
      q.fecha.$gte = isDateOnly ? parseDateParam(desde) : new Date(desde);
    }
    if (hasta) {
      const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(hasta);
      q.fecha.$lte = isDateOnly ? parseDateParam(hasta, true) : new Date(hasta);
    }

    // total matching documents for pagination
    const total = await FinanceEntry.countDocuments(q);
    const skip = (page - 1) * pageSize;
    const items = await FinanceEntry.find(q).sort({ fecha: -1 }).skip(skip).limit(pageSize).lean();
    return NextResponse.json({ items, total, page, pageSize });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Unexpected' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const e = await ensureAdmin();
    if (!e.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: e.status });

    await connectMongo();
    const body = await req.json().catch(() => ({}));

    // normalize fecha
    const fechaVal = body.fecha
      ? (typeof body.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.fecha) ? new Date(`${body.fecha}T12:00:00Z`) : new Date(body.fecha))
      : new Date();

    // determine tipo: prefer proyecto -> INGRESO; else if metadata.proveedorId -> GASTO; otherwise use provided or default GASTO
    let tipoFinal = body.tipo || 'GASTO';
    // normalize helpers
    const metadata = body.metadata || {};
    const clienteId = body.clienteId || metadata.clienteId || metadata.clientId || undefined;
    const proveedorId = body.proveedorId || metadata.proveedorId || undefined;
    const paymentMethod = _norm(metadata.paymentMethod || body.paymentMethod || metadata.formaPago || body.formaPago || '');

    // If paymentMethod explicitly provided, use it to route
    if (paymentMethod) {
      if (paymentMethod.includes('credito')) {
        if (clienteId) tipoFinal = 'INGRESO';
        else if (proveedorId) tipoFinal = 'GASTO';
      } else if (paymentMethod.includes('contad')) {
        // contado: immediate cash movement
        if (clienteId) tipoFinal = 'INGRESO';
        else if (proveedorId) tipoFinal = 'GASTO';
      }
    } else {
      // fallback heuristics
      if (body.proyectoId) tipoFinal = 'INGRESO';
      else if (proveedorId) tipoFinal = 'GASTO';
    }

    // determine categoria default when routing automatically, but respect explicit body.categoria
    let categoriaFinal = typeof body.categoria !== 'undefined' ? body.categoria : '';
    if (!categoriaFinal) {
      // if paymentMethod given prefer mapping
      if (paymentMethod) {
        if (paymentMethod.includes('credito')) {
          if (clienteId) categoriaFinal = 'CxC';
          else if (proveedorId) categoriaFinal = 'CxP';
        } else if (paymentMethod.includes('contad')) {
          if (clienteId) categoriaFinal = 'Ingresos';
          else if (proveedorId) categoriaFinal = 'Gastos';
        }
      }
      // fallback: project => CxC, proveedor metadata => CxP
      if (!categoriaFinal) {
        if (body.proyectoId) categoriaFinal = 'CxC';
        else if (proveedorId) categoriaFinal = 'CxP';
        else categoriaFinal = '';
      }
    }

    // Prevent expenses classified as 'Mano de Obra' from feeding CxP (accounts payable)
    const isManoDeObra = (_norm(categoriaFinal).includes('mano') && _norm(categoriaFinal).includes('obra'))
      || (_norm(body.categoria).includes('mano') && _norm(body.categoria).includes('obra'))
      || (_norm(metadata?.categoria).includes('mano') && _norm(metadata?.categoria).includes('obra'));
    if (tipoFinal === 'GASTO' && isManoDeObra) {
      // enforce category label and mark metadata so clients/integrations know this must not create CxP
      categoriaFinal = 'Mano de Obra';
      body.metadata = { ...(metadata || {}), nonCxP: true };
    }

    // ensure facturaId preserved if provided
    if (metadata.facturaId || body.facturaId) {
      body.metadata = { ...(body.metadata || {}), facturaId: metadata.facturaId || body.facturaId };
    }

    const doc = await FinanceEntry.create({
      fecha: fechaVal,
      tipo: tipoFinal,
      monto: Number(body.monto) || 0,
      categoria: categoriaFinal || '',
      proyectoId: body.proyectoId || undefined,
      subContratistaId: body.subContratistaId || undefined,
      nota: body.nota || undefined,
      metadata: typeof body.metadata !== 'undefined' ? body.metadata : undefined,
    });

    return NextResponse.json(doc);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Unexpected' }, { status: 500 });
  }
}
