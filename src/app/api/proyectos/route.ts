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
    let actorFromSession = undefined;
    try {
      const { auth } = await import("@/lib/auth");
      const session = await auth();
      if (session && (session as any).user && (session as any).user.email) actorFromSession = (session as any).user.email;
    } catch (e) {}
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
      created_by: actorFromSession || body.actor || undefined,
    });
    return NextResponse.json(doc);
  } catch (e) {
    return NextResponse.json({ error: "Unexpected" }, { status: 500 });
  }
}
