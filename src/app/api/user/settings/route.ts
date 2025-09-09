import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const theme = String(form.get("theme") || "system");
  const widgets = String(form.get("widgets") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  await connectMongo();
  const { default: User } = await import("@/models/User");
  await User.updateOne(
    { email: session.user.email },
    { $set: { settings: { theme, widgets } } },
    { upsert: false }
  );

  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
  return NextResponse.redirect(`${base}/perfil`, { status: 303 });
}
