import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import { role as RoleEnum } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectMongo();
    const { default: Actividad } = await import("@/models/Actividad");
    const doc = await Actividad.findById(params.id).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ id: String((doc as any)._id), ...doc });
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

    // permiso: si no es ADMIN, solo el supervisor creador puede actualizar
    const existing = await Actividad.findById(params.id).lean();
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // @ts-ignore
    const userId = session.user?.id ?? session.user?.email;
    const userRole = (session as any).user?.role as string | undefined;
    if (userRole !== RoleEnum.ADMIN && String(existing.supervisorId) !== String(userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const doc = await Actividad.findByIdAndUpdate(params.id, body, { new: true }).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ id: String((doc as any)._id), ...doc });
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
    const existing = await Actividad.findById(params.id).lean();
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // @ts-ignore
    const userId = session.user?.id ?? session.user?.email;
    const userRole = (session as any).user?.role as string | undefined;
    if (userRole !== RoleEnum.ADMIN && String(existing.supervisorId) !== String(userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await Actividad.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Error eliminando" }, { status: 500 });
  }
}
