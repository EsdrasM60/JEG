import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, role as RoleEnum } from "@/lib/auth";
import { db } from "@/lib/sqlite";
import { connectMongo } from "@/lib/mongo";
import nodemailer from "nodemailer";

function splitName(full: string) {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { nombre: "", apellido: "" };
  if (parts.length === 1) return { nombre: parts[0], apellido: parts[0] };
  const apellido = parts.pop() as string;
  const nombre = parts.join(" ");
  return { nombre, apellido };
}
function makeShortId(seed: string) {
  let h = 0 >>> 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return String(100 + (h % 900));
}

export async function POST(_req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const r = session?.user?.role as string | undefined;
  if (!session || (r !== RoleEnum.ADMIN && r !== RoleEnum.COORDINADOR)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    if (process.env.MONGODB_URI) {
      await connectMongo();
      const { default: User } = await import("@/models/User");
      const user = await User.findById(id);
      if (!user) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

      user.emailVerified = true as any; // boolean flag
      await user.save();

      // Crear voluntario si no existe
      try {
        const { default: Volunteer } = await import("@/models/Volunteer");
        const exists = await Volunteer.findOne({ email: user.email }).lean();
        if (!exists) {
          const { nombre, apellido } = splitName(user.name || user.email || "");
          let shortId = makeShortId(`${nombre}-${apellido}-${Date.now()}`);
          for (let i = 0; i < 5; i++) {
            const c = await Volunteer.findOne({ shortId }).lean();
            if (!c) break;
            shortId = makeShortId(`${nombre}-${apellido}-${Date.now()}-${i}`);
          }
          await Volunteer.create({ nombre, apellido, email: user.email, shortId });
        }
      } catch {}

      // Notificar al usuario
      try {
        if (process.env.SMTP_HOST && process.env.SMTP_USER && (process.env.SMTP_FROM || process.env.SMTP_USER)) {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: false,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
          });
          await transporter.sendMail({
            from: `Mantenimiento SR <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: user.email,
            subject: "Tu cuenta fue aprobada",
            text: `Hola ${user.name || user.email}, tu cuenta ha sido aprobada. Ya puedes iniciar sesión.`,
          });
        }
      } catch {}

      return NextResponse.json({ ok: true });
    } else {
      const row = db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(id) as { id: string; name: string; email: string } | undefined;
      if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      const info = db.prepare("UPDATE users SET email_verified = 1 WHERE id = ?").run(id);
      if (info.changes === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      // crear voluntario si no existe
      try {
        const exists = db.prepare("SELECT id FROM volunteers WHERE lower(email)=lower(?) LIMIT 1").get(row.email) as { id: string } | undefined;
        if (!exists) {
          const { nombre, apellido } = splitName(row.name || row.email);
          const vid = crypto.randomUUID();
          const shortId = makeShortId(`${nombre}-${apellido}-${Date.now()}`);
          db.prepare(
            `INSERT INTO volunteers (id, nombre, apellido, email, short_id) VALUES (?, ?, ?, ?, ?)`
          ).run(vid, nombre, apellido, row.email, shortId);
        }
      } catch {}
      // correo
      try {
        if (process.env.SMTP_HOST && process.env.SMTP_USER && (process.env.SMTP_FROM || process.env.SMTP_USER)) {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: false,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
          });
          await transporter.sendMail({
            from: `Mantenimiento SR <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: row.email,
            subject: "Tu cuenta fue aprobada",
            text: `Hola ${row.name || row.email}, tu cuenta ha sido aprobada. Ya puedes iniciar sesión.`,
          });
        }
      } catch {}
      return NextResponse.json({ ok: true });
    }
  } catch (e: any) {
    return NextResponse.json({ error: "Error aprobando" }, { status: 500 });
  }
}
