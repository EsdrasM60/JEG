import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, role as RoleEnum } from "@/lib/auth";
import { db } from "@/lib/sqlite";
import { z } from "zod";
import { connectMongo } from "@/lib/mongo";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export async function PATCH(req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const r = session?.user?.role as string | undefined;
  if (!session || (r !== RoleEnum.ADMIN && r !== RoleEnum.COORDINADOR)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { name, email } = parsed.data;
  const { id } = params;

  try {
    if (process.env.MONGODB_URI) {
      await connectMongo();
      const { default: User } = await import("@/models/User");
      const update: any = {};
      if (name !== undefined) update.name = name;
      if (email !== undefined) update.email = email;
      const doc = await User.findByIdAndUpdate(id, update, { new: true });
      if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      return NextResponse.json({
        id: String(doc._id),
        name: doc.name,
        email: doc.email,
        role: (doc as any).role,
        emailVerified: !!(doc as any).emailVerified,
        createdAt: doc.createdAt,
      });
    } else {
      if (name !== undefined) {
        db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, id);
      }
      if (email !== undefined) {
        db.prepare("UPDATE users SET email = ? WHERE id = ?").run(email, id);
      }
      const row = db
        .prepare(
          "SELECT id, name, email, role, email_verified as emailVerified, datetime(created_at) as createdAt FROM users WHERE id = ?"
        )
        .get(id);
      return NextResponse.json(row);
    }
  } catch (e: any) {
    if (String(e?.message || e).includes("UNIQUE")) {
      return NextResponse.json({ error: "El correo ya está registrado" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error actualizando" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const r = session?.user?.role as string | undefined;
  if (!session || r !== RoleEnum.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = params;

  try {
    if (process.env.MONGODB_URI) {
      await connectMongo();
      const { default: User } = await import("@/models/User");
      const res = await User.deleteOne({ _id: id });
      if (res.deletedCount === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      return NextResponse.json({ ok: true });
    } else {
      const info = db.prepare("DELETE FROM users WHERE id = ?").run(id);
      if (info.changes === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }
  } catch (e: any) {
    return NextResponse.json({ error: "Error eliminando" }, { status: 500 });
  }
}
