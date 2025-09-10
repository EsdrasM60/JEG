import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/sqlite";
import { z } from "zod";
import { connectMongo } from "@/lib/mongo";

const createSchema = z.object({
  nombre: z.string().min(2),
  apellido: z.string().min(2),
  telefono: z.string().optional().nullable(),
  congregacion: z.string().optional().nullable(),
  empresa: z.string().optional().nullable(),
  a2: z.boolean().optional(),
  trabajo_altura: z.boolean().optional(),
});

function makeShortId(seed: string) {
  // hash simple y estable -> 100..999
  let h = 0 >>> 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return String(100 + (h % 900));
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (process.env.MONGODB_URI) {
    try {
      await connectMongo();
      const { default: Volunteer } = await import("@/models/Volunteer");
      const docs = await Volunteer.find({})
        .collation({ locale: "es", strength: 1 })
        .sort({ apellido: 1, nombre: 1 })
        .lean();
      const rows = docs.map((d: any) => ({
        id: String(d._id),
        shortId: d.shortId || makeShortId(String(d._id)),
        nombre: d.nombre,
        apellido: d.apellido,
        email: d.email ?? null,
        telefono: d.telefono ?? null,
        congregacion: d.congregacion ?? null,
        empresa: d.empresa ?? d.congregacion ?? null,
        a2: !!d.a2,
        trabajo_altura: !!d.trabajo_altura,
        createdAt: d.createdAt,
      }));
      return NextResponse.json(rows);
    } catch (e: any) {
      return NextResponse.json({ error: "Error consultando" }, { status: 500 });
    }
  }

  const rows = db
    .prepare(
      "SELECT id, short_id as shortId, nombre, apellido, email, telefono, congregacion, a2, trabajo_altura, datetime(created_at) as createdAt FROM volunteers ORDER BY lower(apellido) ASC, lower(nombre) ASC"
    )
    .all();
  return NextResponse.json(rows.map((r: any) => ({ ...(r as any), empresa: r.congregacion }))); // sqlite stores in congregacion
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const data = parsed.data as any;
  // accept empresa, map to congregacion for sqlite compatibility
  if (data.empresa !== undefined) data.congregacion = data.empresa ?? null;

  try {
    if (process.env.MONGODB_URI) {
      await connectMongo();
      const { default: Volunteer } = await import("@/models/Volunteer");
      const doc: any = await Volunteer.create(data);
      return NextResponse.json({ id: String(doc._id) });
    } else {
      const info = db
        .prepare(
          "INSERT INTO volunteers (short_id, nombre, apellido, telefono, congregacion, a2, trabajo_altura, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))"
        )
        .run(null, data.nombre, data.apellido, data.telefono ?? null, data.congregacion ?? null, data.a2 ? 1 : 0, data.trabajo_altura ? 1 : 0);
      return NextResponse.json({ id: String(info.lastInsertRowid) });
    }
  } catch (e: any) {
    return NextResponse.json({ error: "Error creando" }, { status: 500 });
  }
}
