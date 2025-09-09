import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/sqlite";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { connectMongo } from "@/lib/mongo";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

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

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { name, email, password } = parsed.data;

  const password_hash = await bcrypt.hash(password, 10);

  try {
    if (process.env.MONGODB_URI) {
      await connectMongo();
      const { default: User } = await import("@/models/User");
      const exists = await User.findOne({ email }).lean();
      if (exists) return NextResponse.json({ error: "El correo ya está registrado" }, { status: 409 });
      await User.create({ name, email, passwordHash: password_hash, role: "VOLUNTARIO", emailVerified: false });

      // Crear voluntario en paralelo si no existe
      try {
        const { default: Volunteer } = await import("@/models/Volunteer");
        const vExists = await Volunteer.findOne({ email }).lean();
        if (!vExists) {
          const { nombre, apellido } = splitName(name || email);
          let shortId = makeShortId(`${nombre}-${apellido}-${Date.now()}`);
          for (let i = 0; i < 5; i++) {
            const c = await Volunteer.findOne({ shortId }).lean();
            if (!c) break;
            shortId = makeShortId(`${nombre}-${apellido}-${Date.now()}-${i}`);
          }
          await Volunteer.create({ nombre, apellido, email, shortId });
        }
      } catch {}
    } else {
      const id = crypto.randomUUID();
      db.prepare(
        `INSERT INTO users (id, name, email, password_hash, role, email_verified)
         VALUES (@id, @name, @email, @password_hash, @role, 0)`
      ).run({ id, name, email, password_hash, role: "VOLUNTARIO" });
      // Crear voluntario si no existe
      try {
        const ex = db.prepare("SELECT id FROM volunteers WHERE lower(email)=lower(?) LIMIT 1").get(email) as { id: string } | undefined;
        if (!ex) {
          const { nombre, apellido } = splitName(name || email);
          const vid = crypto.randomUUID();
          const shortId = makeShortId(`${nombre}-${apellido}-${Date.now()}`);
          db.prepare(
            `INSERT INTO volunteers (id, nombre, apellido, email, short_id) VALUES (?, ?, ?, ?, ?)`
          ).run(vid, nombre, apellido, email, shortId);
        }
      } catch {}
    }
  } catch (e: any) {
    if (String(e?.message || e).includes("UNIQUE")) {
      return NextResponse.json({ error: "El correo ya está registrado" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error registrando" }, { status: 500 });
  }

  // Emails: aviso al usuario y al admin (si SMTP configurado)
  try {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && (process.env.SMTP_FROM || process.env.SMTP_USER)) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      // Usuario
      await transporter.sendMail({
        from: `Mantenimiento SR <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: "Registro recibido",
        text: `Hola ${name || email}, tu cuenta fue creada y está pendiente de aprobación. Te avisaremos cuando esté lista.`,
      });
      // Admin
      const admin = process.env.ADMIN_EMAIL;
      if (admin) {
        await transporter.sendMail({
          from: `Mantenimiento SR <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to: admin,
          subject: "Nuevo registro pendiente de aprobación",
          text: `Nombre: ${name}\nEmail: ${email}`,
        });
      }
    }
  } catch {}

  return NextResponse.json({ ok: true });
}
