import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import Task from "@/models/Task";

export async function GET(_req: Request, context: any) {
  try {
    await connectMongo();
    const { params } = context as { params: { id: string } };
    const { id } = params;
    const doc = await Task.findById(id).lean();
    if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(doc);
  } catch (e) {
    return NextResponse.json({ error: "Unexpected" }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: any) {
  try {
    await connectMongo();
    const { params } = context as { params: { id: string } };
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const updates: any = {};
    if ("title" in body) updates.title = body.title || null;
    if ("description" in body) updates.description = body.description || null;
    if ("status" in body) updates.status = body.status || "TODO";
    if ("priority" in body) updates.priority = typeof body.priority === "number" ? body.priority : 3;
    if ("assigneeId" in body) updates.assigneeId = body.assigneeId || null;
    if ("dueDate" in body) updates.dueDate = body.dueDate ? new Date(body.dueDate) : null;

    const doc = await Task.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(doc);
  } catch (e) {
    return NextResponse.json({ error: "Unexpected" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: any) {
  try {
    await connectMongo();
    const { params } = context as { params: { id: string } };
    const { id } = params;
    const res = await Task.deleteOne({ _id: id });
    if (res.deletedCount === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Unexpected" }, { status: 500 });
  }
}
