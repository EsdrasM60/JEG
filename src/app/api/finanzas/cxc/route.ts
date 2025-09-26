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
    const e = await ensureAdmin();
    if (!e.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: e.status });

    await connectMongo();
    const url = new URL(req.url);
    const sp = url.searchParams;

    const desde = parseDateParam(sp.get('desde') || undefined, false);
    const hasta = parseDateParam(sp.get('hasta') || undefined, true);
    const categoria = sp.get('categoria') || undefined;
    const subContratistaId = sp.get('subContratistaId') || undefined;
    const proyectoId = sp.get('proyectoId') || undefined;
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);
    const pageSize = Math.min(1000, Math.max(1, parseInt(sp.get('pageSize') || '1000', 10) || 1000));

    const match: any = { tipo: 'INGRESO' };

    if (categoria) {
      match.categoria = categoria;
    } else {
      const re = new RegExp('^CxC$', 'i');
      match.$or = [ { categoria: { $regex: re } }, { 'metadata.categoria': { $regex: re } } ];
    }

    if (subContratistaId) match.subContratistaId = subContratistaId;
    if (proyectoId) match.proyectoId = proyectoId;
    if (desde || hasta) {
      match.fecha = {};
      if (desde) match.fecha.$gte = desde;
      if (hasta) match.fecha.$lte = hasta;
    }

    // list items with pagination
    const total = await FinanceEntry.countDocuments(match);
    const skip = (page - 1) * pageSize;
    const items = await FinanceEntry.find(match).sort({ fecha: -1 }).skip(skip).limit(pageSize).lean();

    // aggregations
    const byProjectAgg = await FinanceEntry.aggregate([
      { $match: match },
      { $group: { _id: { $ifNull: ["$proyectoId", "sin-proyecto"] }, total: { $sum: "$monto" } } },
      { $sort: { total: -1 } }
    ]);

    const bySubAgg = await FinanceEntry.aggregate([
      { $match: match },
      { $group: { _id: { $ifNull: ["$subContratistaId", "sin-sub"] }, total: { $sum: "$monto" } } },
      { $sort: { total: -1 } }
    ]);

    const totalSumAgg = await FinanceEntry.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: "$monto" } } }
    ]);

    const byProject = byProjectAgg.map((x: any) => ({ key: x._id, total: x.total }));
    const bySub = bySubAgg.map((x: any) => ({ key: x._id, total: x.total }));
    const totalSum = totalSumAgg[0]?.total || 0;

    return NextResponse.json({ items, total, page, pageSize, byProject, bySub, totalSum });
  } catch (err: any) {
    console.error('GET /api/finanzas/cxc error', err);
    return NextResponse.json({ error: 'Unexpected' }, { status: 500 });
  }
}
