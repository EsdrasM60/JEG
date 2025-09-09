import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectMongo } from "@/lib/mongo";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const key = req.headers.get("x-admin-reset-key") ?? new URL(req.url).searchParams.get("key");
    const expected = process.env.ADMIN_RESET_KEY;
    if (!expected) return NextResponse.json({ error: "ADMIN_RESET_KEY no configurado" }, { status: 500 });
    if (!key || key !== expected) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const email = (body?.email as string) || process.env.ADMIN_EMAIL;
    const password = (body?.password as string) || process.env.ADMIN_PASSWORD;

    if (!email || !password) return NextResponse.json({ error: "Faltan email o password" }, { status: 400 });

    await connectMongo();
    const { default: User } = await import("@/models/User");

    const passwordHash = bcrypt.hashSync(password, 10);

    const updated = await User.findOneAndUpdate(
      { email },
      { name: "Administrador", email, passwordHash, role: "ADMIN", emailVerified: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json({ ok: true, id: String((updated as any)?._id), email });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const key = req.headers.get("x-admin-reset-key") ?? url.searchParams.get("key");
    const expected = process.env.ADMIN_RESET_KEY;
    if (!expected) return NextResponse.json({ error: "ADMIN_RESET_KEY no configurado" }, { status: 500 });
    if (!key || key !== expected) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = url.searchParams.get("email") || process.env.ADMIN_EMAIL;
    const password = url.searchParams.get("password") || process.env.ADMIN_PASSWORD;
    if (!email || !password) return NextResponse.json({ error: "Faltan email o password" }, { status: 400 });

    await connectMongo();
    const { default: User } = await import("@/models/User");

    const passwordHash = bcrypt.hashSync(password, 10);
    const updated = await User.findOneAndUpdate(
      { email },
      { name: "Administrador", email, passwordHash, role: "ADMIN", emailVerified: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json({ ok: true, id: String((updated as any)?._id), email });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}
