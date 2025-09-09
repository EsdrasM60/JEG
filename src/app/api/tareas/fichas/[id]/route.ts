import { NextResponse } from "next/server";
import { z } from "zod";
import { connectMongo } from "@/lib/mongo";
import { auth } from "@/lib/auth";
import { db } from "@/lib/sqlite";
import { toObjectId } from "@/lib/gridfs";

const checklistItem = z.object({ text: z.string().min(1), done: z.boolean().optional() });
const patchSchema = z.object({
  titulo: z.string().min(2).optional(),
  descripcion: z.string().optional().nullable(),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA"]).optional(),
  estado: z.enum(["ABIERTA", "EN_PROGRESO", "COMPLETADA"]).optional(),
  asignado_a: z.string().optional().nullable(),
  vencimiento: z.string().datetime().optional().nullable(),
  instrucciones: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  checklist: z.array(checklistItem).optional().nullable(),
  pdfId: z.string().optional().nullable(),
});

export async function PATCH(req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  if (process.env.MONGODB_URI) {
    await connectMongo();
    const { default: Ficha } = await import("@/models/Ficha");
    const update: any = { ...parsed.data };
    if (update.vencimiento) update.vencimiento = new Date(update.vencimiento);
    if (Object.prototype.hasOwnProperty.call(update, "pdfId")) {
      const idVal = update.pdfId;
      if (idVal) {
        const _id = toObjectId(String(idVal));
        update.pdfId = _id ?? null;
      } else {
        update.pdfId = null;
      }
    }
    const doc = await Ficha.findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true }
    ).lean();
    if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  const row = db.prepare("SELECT id FROM fichas WHERE id = ?").get(params.id) as { id: string } | undefined;
  if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const current = db
    .prepare(
      "SELECT titulo, descripcion, prioridad, estado, asignado_a, vencimiento, instrucciones, notas, checklist FROM fichas WHERE id = ?"
    )
    .get(params.id) as any;
  const updated = { ...current, ...parsed.data };
  db.prepare(
    `UPDATE fichas SET titulo=?, descripcion=?, prioridad=?, estado=?, asignado_a=?, vencimiento=?, instrucciones=?, notas=?, checklist=?, pdfId=? WHERE id=`
      + `?`
  ).run(
    updated.titulo,
    updated.descripcion ?? null,
    updated.prioridad,
    updated.estado,
    updated.asignado_a ?? null,
    updated.vencimiento ?? null,
    updated.instrucciones ?? null,
    updated.notas ?? null,
    updated.checklist ? JSON.stringify(updated.checklist.map((c: any) => ({ text: c.text, done: !!c.done }))) : current.checklist,
    updated.pdfId ?? null,
    params.id
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (process.env.MONGODB_URI) {
    await connectMongo();
    const { default: Ficha } = await import("@/models/Ficha");
    const res = await Ficha.findByIdAndDelete(params.id);
    if (!res) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  const row = db.prepare("SELECT id FROM fichas WHERE id = ?").get(params.id) as { id: string } | undefined;
  if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  db.prepare("DELETE FROM fichas WHERE id = ?").run(params.id);
  return NextResponse.json({ ok: true });
}
