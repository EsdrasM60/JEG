import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import Project from "@/models/Project";

export async function GET(req: Request) {
  await connectMongo();
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 200);
  const skip = (page - 1) * pageSize;

  const items = await Project.find({})
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .select({ titulo: 1, descripcion: 1, estado: 1, voluntarioId: 1, ayudanteId: 1, fechaInicio: 1, fechaFin: 1, checklist: 1, evidencias: 1 })
    .lean();

  const total = await Project.countDocuments({});
  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(req: Request) {
  try {
    await connectMongo();
    const body = await req.json().catch(() => ({}));
    if (!body.titulo) return NextResponse.json({ error: "titulo requerido" }, { status: 400 });
    // Normalize presupuesto if provided
    let presupuestoNormalized: any = undefined;
    if (body.presupuesto && typeof body.presupuesto === 'object') {
      const p = body.presupuesto;
      const materiales = Number(p.materiales) || 0;
      const manoDeObra = Number(p.manoDeObra) || 0;
      const direccionTecnica = Number(p.direccionTecnica) || 0;
      const indirectos = Number(p.indirectos) || 0;
      const itbis = Number(p.itbis) || 0;
      const total = Number(p.total) || (materiales + manoDeObra + direccionTecnica + indirectos + itbis);
      presupuestoNormalized = { materiales, manoDeObra, direccionTecnica, indirectos, itbis, total };
    }
    const doc = await Project.create({
      titulo: body.titulo,
      descripcion: body.descripcion || undefined,
      estado: body.estado || "PLANIFICADO",
      voluntarioId: body.voluntarioId || undefined,
      ayudanteId: body.ayudanteId || undefined,
      fechaInicio: body.fechaInicio ? new Date(body.fechaInicio) : undefined,
      fechaFin: body.fechaFin ? new Date(body.fechaFin) : undefined,
      etiquetas: Array.isArray(body.etiquetas) ? body.etiquetas : [],
      checklist: Array.isArray(body.checklist)
        ? body.checklist.map((item: any) => (typeof item === "string" ? { text: item, done: false } : { text: String(item?.text || ""), done: Boolean(item?.done) })).filter((i: any) => i.text)
        : [],
      presupuesto: presupuestoNormalized,
      created_by: body.actor || undefined,
    });
    return NextResponse.json(doc);
  } catch (e) {
    return NextResponse.json({ error: "Unexpected" }, { status: 500 });
  }
}
