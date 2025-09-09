import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import Task from "@/models/Task";

export async function GET(req: Request) {
  await connectMongo();
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 200);
  const projectId = searchParams.get("projectId") || undefined;
  const skip = (page - 1) * pageSize;

  const filter: any = {};
  if (projectId) filter.projectId = projectId;

  const items = await Task.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .lean();

  const total = await Task.countDocuments(filter);
  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(req: Request) {
  try {
    await connectMongo();
    const body = await req.json().catch(() => ({}));
    if (!body.title || !body.projectId) return NextResponse.json({ error: "titulo y projectId requeridos" }, { status: 400 });
    const doc = await Task.create({
      projectId: body.projectId,
      title: body.title,
      description: body.description || undefined,
      status: body.status || "TODO",
      priority: typeof body.priority === "number" ? body.priority : 3,
      assigneeId: body.assigneeId || undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      created_by: body.actor || undefined,
    });
    return NextResponse.json(doc);
  } catch (e) {
    return NextResponse.json({ error: "Unexpected" }, { status: 500 });
  }
}
