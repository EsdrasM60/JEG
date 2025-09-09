import { NextResponse } from "next/server";
import { z } from "zod";
import { connectMongo } from "@/lib/mongo";
import { auth } from "@/lib/auth";
import { db } from "@/lib/sqlite";
import { getGridFSBucket, toObjectId } from "@/lib/gridfs";

const checklistItem = z.object({ text: z.string().min(1), done: z.boolean().optional().default(false) });
const schema = z.object({
  titulo: z.string().min(2),
  descripcion: z.string().optional().nullable(),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA"]).default("MEDIA"),
  estado: z.enum(["ABIERTA", "EN_PROGRESO", "COMPLETADA"]).default("ABIERTA"),
  asignado_a: z.string().optional().nullable(),
  vencimiento: z.string().datetime().optional().nullable(),
  pdfId: z.string().optional().nullable(),
  instrucciones: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  checklist: z.array(checklistItem).optional().nullable(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "10", 10) || 10, 1), 50);
  const sort = (searchParams.get("sort") || "alpha").toLowerCase();
  const skip = (page - 1) * pageSize;

  if (process.env.MONGODB_URI) {
    await connectMongo();
    const { default: Ficha } = await import("@/models/Ficha");
    const [total, docs] = await Promise.all([
      Ficha.countDocuments({}),
      Ficha.find({})
        .collation({ locale: "es", strength: 1 })
        .sort(sort === "alpha" ? { titulo: 1 } : { createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
    ]);
    return NextResponse.json({
      items: docs.map((d: any) => ({
        id: String(d._id),
        titulo: d.titulo,
        descripcion: d.descripcion ?? null,
        prioridad: d.prioridad,
        estado: d.estado,
        asignado_a: d.asignado_a ?? null,
        vencimiento: d.vencimiento ?? null,
        createdAt: d.createdAt,
        pdfId: d.pdfId ? String(d.pdfId) : null,
        instrucciones: d.instrucciones ?? null,
        notas: d.notas ?? null,
        checklist: Array.isArray(d.checklist) ? d.checklist.map((it: any) => ({ text: String(it.text), done: !!it.done })) : [],
      })),
      total,
      page,
      pageSize,
    });
  }

  const totalRow = db.prepare("SELECT COUNT(*) as c FROM fichas").get() as { c: number };
  const orderBy = sort === "alpha" ? "titulo COLLATE NOCASE ASC" : "created_at DESC";
  const rows = db
    .prepare(
      `SELECT id, titulo, descripcion, prioridad, estado, asignado_a, vencimiento, instrucciones, notas, checklist, pdfId, datetime(created_at) as createdAt FROM fichas ORDER BY ${orderBy} LIMIT ? OFFSET ?`
    )
    .all(pageSize, skip)
    .map((r: any) => ({
      ...r,
      pdfId: r.pdfId ?? null,
      checklist: r.checklist ? (JSON.parse(r.checklist) as any[]).map((it) => ({ text: String(it.text), done: !!it.done })) : [],
    }));
  return NextResponse.json({ items: rows, total: totalRow.c, page, pageSize });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { titulo, descripcion, prioridad, estado, asignado_a, vencimiento, pdfId, instrucciones, notas, checklist } = parsed.data;

  if (process.env.MONGODB_URI) {
    await connectMongo();
    const { default: Ficha } = await import("@/models/Ficha");
    const payload: any = {
      titulo,
      descripcion: descripcion ?? null,
      prioridad,
      estado,
      asignado_a: asignado_a ?? null,
      vencimiento: vencimiento ? new Date(vencimiento) : null,
      created_by: session.user?.email ?? null,
      instrucciones: instrucciones ?? null,
      notas: notas ?? null,
      checklist: Array.isArray(checklist) ? checklist.map((c) => ({ text: c.text, done: !!c.done })) : [],
    };
    if (pdfId) {
      const _id = toObjectId(pdfId);
      if (_id) payload.pdfId = _id;
    }
    const doc = await Ficha.create(payload);
    return NextResponse.json({ ok: true, id: String(doc._id) });
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO fichas (id, titulo, descripcion, prioridad, estado, asignado_a, vencimiento, instrucciones, notas, checklist, pdfId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    titulo,
    descripcion ?? null,
    prioridad,
    estado,
    asignado_a ?? null,
    vencimiento ?? null,
    instrucciones ?? null,
    notas ?? null,
    checklist ? JSON.stringify(checklist.map((c) => ({ text: c.text, done: !!c.done }))) : null,
    pdfId ?? null
  );
  return NextResponse.json({ ok: true, id });
}
