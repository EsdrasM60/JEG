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
    // devolver subset
    const { scope, initialBudget, cubicaciones, payments, adicionales, weeklyTasks, estado } = p as any;
    return NextResponse.json({ scope, initialBudget, cubicaciones, payments, adicionales, weeklyTasks, estado });
  } catch (e: any) {
    return NextResponse.json({ error: "Error consultando" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    await connectMongo();
    const { default: Project } = await import("@/models/Project");
    const updated = await Project.findByIdAndUpdate(params.id, { $set: body }, { new: true }).lean();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, id: String(updated._id) });
  } catch (e: any) {
    return NextResponse.json({ error: "Error actualizando" }, { status: 500 });
  }
}
