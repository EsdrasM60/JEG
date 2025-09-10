import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import { paymentCreateSchema } from "../validators";
import { ensureRole, handleGuardError } from '@/lib/guard';

function extractId(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    ensureRole(session, ["ADMIN", "COORDINADOR", "VOLUNTARIO"]);
    await connectMongo();
    const id = extractId(req);
    const { default: Project } = await import("@/models/Project");
    const p = await Project.findById(id).lean();
    if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const pAny = p as any;
    return NextResponse.json(pAny.payments || []);
  } catch (e: any) {
    return handleGuardError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    ensureRole(session, ["ADMIN", "COORDINADOR"]); // only coordinators/admin can add payments
    const bodyRaw = await req.json().catch(() => ({}));
    const parsed = paymentCreateSchema.safeParse(bodyRaw);
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    const body = parsed.data as any;

    await connectMongo();
    const id = extractId(req);
    const { default: Project } = await import("@/models/Project");
    const p = await Project.findById(id);
    if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
    ((p as any).payments).push({ amount: body.amount, date: body.date ? new Date(body.date) : new Date(), method: body.method, note: body.note, createdBy: (session as any).user?.email ?? (session as any).user?.name ?? 'unknown' });
    await p.save();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return handleGuardError(e);
  }
}
