import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectMongo();
    const { default: Project } = await import("@/models/Project");
    const p = await Project.findById(params.id).lean();
    if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(p.cubicaciones || []);
  } catch (e: any) {
    return NextResponse.json({ error: "Error consultando" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    await connectMongo();
    const { default: Project } = await import("@/models/Project");
    const p = await Project.findById(params.id);
    if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
    p.cubicaciones.push(body);
    await p.save();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Error creando" }, { status: 500 });
  }
}
