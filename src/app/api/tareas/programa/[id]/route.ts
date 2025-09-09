import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import Programa from "@/models/Programa";

export async function PATCH(req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  await connectMongo();
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const updates: any = {};
  if ("completadoFecha" in body) {
    const v = body.completadoFecha;
    updates.completadoFecha = v ? new Date(v) : null;
  }
  if ("notas" in body) updates.notas = body.notas ?? null;
  if ("fotos" in body && Array.isArray(body.fotos)) updates.fotos = body.fotos;
  if ("voluntarioId" in body && body.voluntarioId) updates.voluntarioId = body.voluntarioId;
  if ("ayudanteId" in body) updates.ayudanteId = body.ayudanteId || null;

  const doc = await Programa.findByIdAndUpdate(id, updates, { new: true })
    .populate("fichaId")
    .populate("voluntarioId")
    .populate("ayudanteId")
    .lean();
  if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function DELETE(_req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  await connectMongo();
  const { id } = params;
  const res = await Programa.deleteOne({ _id: id });
  if (res.deletedCount === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
