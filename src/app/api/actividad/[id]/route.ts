import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectMongo();
    const { default: Actividad } = await import("@/models/Actividad");
    const doc = await Actividad.findById(params.id).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ id: String(doc._id), ...doc });
  } catch (e: any) {
    return NextResponse.json({ error: "Error consultando" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectMongo();
    const { default: Actividad } = await import("@/models/Actividad");
    const body = await req.json().catch(() => ({}));
    const doc = await Actividad.findByIdAndUpdate(params.id, body, { new: true }).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ id: String(doc._id), ...doc });
  } catch (e: any) {
    return NextResponse.json({ error: "Error actualizando" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectMongo();
    const { default: Actividad } = await import("@/models/Actividad");
    await Actividad.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Error eliminando" }, { status: 500 });
  }
}
