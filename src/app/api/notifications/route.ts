import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, role as RoleEnum } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";

export async function GET(_req: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const r = session?.user?.role as string | undefined;
  if (!session || (r !== RoleEnum.ADMIN && r !== RoleEnum.COORDINADOR)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectMongo();
    const { default: Notification } = await import("@/models/Notification");
    const list = await Notification.find({ resolved: false }).sort({ createdAt: -1 }).limit(50).lean();
    return NextResponse.json({ ok: true, data: list });
  } catch (e: any) {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const r = session?.user?.role as string | undefined;
  if (!session || (r !== RoleEnum.ADMIN && r !== RoleEnum.COORDINADOR)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectMongo();
    const { default: Notification } = await import("@/models/Notification");
    const body = await req.json();
    const { id, action } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    if (action === "resolve") {
      await Notification.findByIdAndUpdate(id, { resolved: true, read: true });
      return NextResponse.json({ ok: true });
    }
    if (action === "read") {
      await Notification.findByIdAndUpdate(id, { read: true });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
