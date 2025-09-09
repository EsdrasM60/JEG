import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import { paymentCreateSchema } from "../validators";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectMongo();
    const { default: Project } = await import("@/models/Project");
    const p = await Project.findById(params.id).lean();
    if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(p.payments || []);
  } catch (e: any) {
    return NextResponse.json({ error: "Error consultando" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const bodyRaw = await req.json().catch(() => ({}));
  const parsed = paymentCreateSchema.safeParse(bodyRaw);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const body = parsed.data as any;
  try {
    await connectMongo();
    const { default: Project } = await import("@/models/Project");
    const p = await Project.findById(params.id);
    if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
    p.payments.push({ amount: body.amount, date: body.date ? new Date(body.date) : new Date(), method: body.method, note: body.note, createdBy: session.user?.email });
    await p.save();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Error creando" }, { status: 500 });
  }
}
