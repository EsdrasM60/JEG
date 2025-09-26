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
      q.fecha.$gte = isDateOnly ? new Date(`${desde}T00:00:00Z`) : new Date(desde);
    }
    if (hasta) {
      const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(hasta);
      q.fecha.$lte = isDateOnly ? new Date(`${hasta}T23:59:59Z`) : new Date(hasta);
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

    // determine tipo: prefer explicit body.tipo; do NOT infer from proyectoId or proveedorId
    let tipoFinal = body.tipo || 'GASTO';

    // determine categoria: respect explicit body.categoria; do NOT auto-route to CxC/CxP based on proyectoId or proveedorId
    let categoriaFinal = typeof body.categoria !== 'undefined' ? body.categoria : '';

    // Previous behavior auto-assigned CxC/CxP when proyectoId or proveedorId existed.
    // To keep CxC and CxP modules independent, do not auto-assign those categories here.

    // Prevent certain expense categories from feeding CxP (accounts payable)
    const categorySource = body.categoria || body.metadata?.categoria || categoriaFinal;
    if (tipoFinal === 'GASTO' && isExcludedCategory(categorySource)) {
      categoriaFinal = canonicalCategory(categorySource);
      body.metadata = { ...(body.metadata || {}), nonCxP: true };
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
