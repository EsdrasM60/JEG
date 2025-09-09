import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const current = String(form.get("current") || "");
  const next = String(form.get("next") || "");
  const confirm = String(form.get("confirm") || "");
  if (!next || next.length < 6) return NextResponse.json({ error: "La nueva contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  if (next !== confirm) return NextResponse.json({ error: "Las contraseñas no coinciden" }, { status: 400 });

  await connectMongo();
  const { default: User } = await import("@/models/User");
  const u = (await User.findOne({ email: session.user.email }).lean()) as any;
  if (!u) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  const ok = u.passwordHash ? await bcrypt.compare(current, u.passwordHash) : false;
  if (!ok) return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 });

  const hash = bcrypt.hashSync(next, 10);
  await User.updateOne({ _id: u._id }, { $set: { passwordHash: hash } });

  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
  return NextResponse.redirect(`${base}/perfil`, { status: 303 });
}
