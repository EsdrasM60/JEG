import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import MediaNote from "@/models/MediaNote";
import { connectMongo } from "@/lib/mongo";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await connectMongo();
  const url = new URL(req.url);
  const mediaId = url.searchParams.get("mediaId");
  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(url.searchParams.get("pageSize") || "20", 10) || 20, 1), 100);
  const skip = (page - 1) * pageSize;

  const match: any = mediaId ? { mediaId } : {};
  const [items, total] = await Promise.all([
    MediaNote.find(match).sort({ fecha: -1, createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    MediaNote.countDocuments(match),
  ]);
  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectMongo();

  const body = await req.json().catch(() => ({}));
  if (!body.mediaId) return NextResponse.json({ error: "mediaId requerido" }, { status: 400 });

  const doc = await MediaNote.create({
    mediaId: body.mediaId,
    thumbId: body.thumbId || null,
    titulo: body.titulo || null,
    nota: body.nota || null,
    voluntarioId: body.voluntarioId || null,
    ayudanteId: body.ayudanteId || null,
    fecha: body.fecha ? new Date(body.fecha) : new Date(),
    etiquetas: Array.isArray(body.etiquetas) ? body.etiquetas : [],
    created_by: session.user?.email || null,
  });
  return NextResponse.json(doc, { status: 201 });
}
