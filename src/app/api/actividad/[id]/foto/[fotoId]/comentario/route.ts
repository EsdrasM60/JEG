import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";

export async function POST(req: Request, context: any) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { params } = context as { params: { id: string; fotoId: string } };
  const body = await req.json().catch(() => ({}));
  if (!body || !body.text) return NextResponse.json({ error: "text requerido" }, { status: 400 });

  await connectMongo();
  const { default: Actividad } = await import("@/models/Actividad");
  const a = await Actividad.findById(params.id);
  if (!a) return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });

  const foto = a.fotos.id(params.fotoId);
  if (!foto) return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });

  foto.comentarios.push({ authorId: session.user?.id ?? session.user?.email, text: body.text, date: new Date() });
  await a.save();
  return NextResponse.json({ ok: true });
}
