import { NextResponse } from "next/server";
import { auth, role as RoleEnum } from "@/lib/auth";
import { db } from "@/lib/sqlite";
import { z } from "zod";
import { connectMongo } from "@/lib/mongo";

const patchSchema = z.object({
  nombre: z.string().min(2).optional(),
  apellido: z.string().min(2).optional(),
  telefono: z.string().optional().nullable(),
  congregacion: z.string().optional().nullable(),
  empresa: z.string().optional().nullable(),
  a2: z.boolean().optional(),
  trabajo_altura: z.boolean().optional(),
});

export async function GET(_req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = params.id;

  try {
    if (process.env.MONGODB_URI) {
      await connectMongo();
      const { default: Volunteer } = await import("@/models/Volunteer");
      const doc: any = await Volunteer.findById(id).lean();
      if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      return NextResponse.json({
        id: String(doc._id),
        shortId: doc.shortId || null,
        nombre: doc.nombre,
        apellido: doc.apellido,
        telefono: doc.telefono ?? null,
        congregacion: doc.congregacion ?? null,
        empresa: doc.empresa ?? doc.congregacion ?? null,
        a2: !!doc.a2,
        trabajo_altura: !!doc.trabajo_altura,
        createdAt: doc.createdAt,
      });
    }

    const row = db
      .prepare(
        "SELECT id, short_id as shortId, nombre, apellido, telefono, congregacion, a2, trabajo_altura, datetime(created_at) as createdAt FROM volunteers WHERE id = ?"
      )
      .get(id);
    if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(row);
  } catch (e: any) {
    return NextResponse.json({ error: "Error consultando" }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const updates = parsed.data as any;
  const id = params.id;

  try {
    if (process.env.MONGODB_URI) {
      await connectMongo();
      const { default: Volunteer } = await import("@/models/Volunteer");
      // if empresa present, write it to both empresa and congregacion for compatibility
      if (updates.empresa !== undefined) updates.congregacion = updates.empresa ?? null;
      const doc: any = await Volunteer.findByIdAndUpdate(id, updates, { new: true });
      if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      return NextResponse.json({
        id: String(doc._id),
        shortId: doc.shortId || null,
        nombre: doc.nombre,
        apellido: doc.apellido,
        telefono: doc.telefono ?? null,
        congregacion: doc.congregacion ?? null,
        empresa: doc.empresa ?? doc.congregacion ?? null,
        a2: !!doc.a2,
        trabajo_altura: !!doc.trabajo_altura,
        createdAt: doc.createdAt,
      });
    } else {
      const run = (sql: string, val: any) => db.prepare(sql).run(val, id);
      if (updates.nombre !== undefined) run("UPDATE volunteers SET nombre = ? WHERE id = ?", updates.nombre);
      if (updates.apellido !== undefined) run("UPDATE volunteers SET apellido = ? WHERE id = ?", updates.apellido);
      if (updates.telefono !== undefined) run("UPDATE volunteers SET telefono = ? WHERE id = ?", updates.telefono ?? null);
      if (updates.congregacion !== undefined) run("UPDATE volunteers SET congregacion = ? WHERE id = ?", updates.congregacion ?? null);
      if (updates.empresa !== undefined) run("UPDATE volunteers SET congregacion = ? WHERE id = ?", updates.empresa ?? null); // sqlite stores in congregacion column
      if (updates.a2 !== undefined) run("UPDATE volunteers SET a2 = ? WHERE id = ?", updates.a2 ? 1 : 0);
      if (updates.trabajo_altura !== undefined) run("UPDATE volunteers SET trabajo_altura = ? WHERE id = ?", updates.trabajo_altura ? 1 : 0);
      const row = db
        .prepare(
          "SELECT id, short_id as shortId, nombre, apellido, telefono, congregacion, a2, trabajo_altura, datetime(created_at) as createdAt FROM volunteers WHERE id = ?"
        )
        .get(id);
      if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      return NextResponse.json(row);
    }
  } catch (e: any) {
    return NextResponse.json({ error: "Error actualizando" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const session = await auth();
  // Solo ADMIN o COORDINADOR pueden eliminar
  // @ts-ignore
  const r = session?.user?.role as string | undefined;
  if (!session || (r !== RoleEnum.ADMIN && r !== RoleEnum.COORDINADOR)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = params.id;

  try {
    if (process.env.MONGODB_URI) {
      await connectMongo();
      const { default: Volunteer } = await import("@/models/Volunteer");
      const res = await Volunteer.deleteOne({ _id: id });
      if (res.deletedCount === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      return NextResponse.json({ ok: true });
    } else {
      const info = db.prepare("DELETE FROM volunteers WHERE id = ?").run(id);
      if (info.changes === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }
  } catch (e: any) {
    return NextResponse.json({ error: "Error eliminando" }, { status: 500 });
  }
}
