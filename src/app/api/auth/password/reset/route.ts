import { NextResponse } from "next/server";
import { z } from "zod";
import { connectMongo } from "@/lib/mongo";
import bcrypt from "bcryptjs";

const schema = z.object({
  email: z.string().email(),
  token: z.string().min(10),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { email, token, password } = parsed.data;

  try {
    await connectMongo();
    const { default: User } = await import("@/models/User");
    const { default: Token } = await import("@/models/PasswordResetToken");

    const t: any = await Token.findOne({ email, token }).lean();
    if (!t || new Date(t.expiresAt).getTime() < Date.now())
      return NextResponse.json({ error: "Token inválido" }, { status: 400 });

    const passwordHash = bcrypt.hashSync(password, 10);
    await User.updateOne({ email }, { $set: { passwordHash } });
    await Token.deleteMany({ email });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
