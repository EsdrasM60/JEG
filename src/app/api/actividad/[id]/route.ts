import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import { role as RoleEnum } from "@/lib/auth";

function extractId(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectMongo();
    const id = extractId(req);
    const { default: Actividad } = await import("@/models/Actividad");
    const doc = await Actividad.findById(id).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ id: String((doc as any)._id), ...doc });
  } catch (e: any) {
    return NextResponse.json({ error: "Error consultando" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectMongo();
    const id = extractId(req);
    const { default: Actividad } = await import("@/models/Actividad");
    const body = await req.json().catch(() => ({}));

    // permiso: si no es ADMIN, solo el supervisor creador puede actualizar
    const existing = await Actividad.findById(id).lean();
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const existingAny = existing as any;
    // @ts-ignore
    const userId = session.user?.id ?? session.user?.email;
    const userRole = (session as any).user?.role as string | undefined;
    if (userRole !== RoleEnum.ADMIN && String(existingAny.supervisorId) !== String(userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const doc = await Actividad.findByIdAndUpdate(id, body, { new: true }).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ id: String((doc as any)._id), ...doc });
  } catch (e: any) {
    return NextResponse.json({ error: "Error actualizando" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectMongo();
    const id = extractId(req);
    const { default: Actividad } = await import("@/models/Actividad");
    const existing = await Actividad.findById(id).lean();
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const existingAny = existing as any;
    // @ts-ignore
    const userId = session.user?.id ?? session.user?.email;
    const userRole = (session as any).user?.role as string | undefined;
    if (userRole !== RoleEnum.ADMIN && String(existingAny.supervisorId) !== String(userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await Actividad.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Error eliminando" }, { status: 500 });
  }
}
