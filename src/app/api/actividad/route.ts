import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import { z } from "zod";

const createSchema = z.object({
  projectId: z.string().min(1),
  fecha: z.string().optional(),
  titulo: z.string().optional(),
  tipo: z.string().optional(),
  descripcion: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");

  try {
    await connectMongo();
    const { default: Actividad } = await import("@/models/Actividad");
    const q: any = {};
    if (projectId) q.projectId = projectId;

    const docs = await Actividad.find(q).sort({ fecha: -1 }).lean();
    return NextResponse.json(docs.map((d: any) => ({ id: String(d._id), ...d })));
  } catch (e: any) {
    return NextResponse.json({ error: "Error consultando actividades" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const data = parsed.data as any;
  try {
    await connectMongo();
    const { default: Actividad } = await import("@/models/Actividad");
    const doc: any = await Actividad.create({
      ...data,
      supervisorId: session.user?.id ?? session.user?.email ?? "unknown",
      fecha: data.fecha ? new Date(data.fecha) : new Date(),
    });
    return NextResponse.json({ id: String(doc._id) });
  } catch (e: any) {
    return NextResponse.json({ error: "Error creando actividad" }, { status: 500 });
  }
}
