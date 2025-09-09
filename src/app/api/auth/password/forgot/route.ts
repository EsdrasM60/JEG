import { NextResponse } from "next/server";
import { z } from "zod";
import { connectMongo } from "@/lib/mongo";
import nodemailer from "nodemailer";
import crypto from "node:crypto";

const schema = z.object({ email: z.string().email() });
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: true });
  const { email } = parsed.data;

  // Generar token
  const token = crypto.randomBytes(32).toString("hex");
  const expires = Date.now() + 1000 * 60 * 30; // 30 min

  try {
    await connectMongo();
    const { default: User } = await import("@/models/User");
    const { default: Token } = await import("../../../../../models/PasswordResetToken");

    const user = await User.findOne({ email }).lean();
    if (!user) return NextResponse.json({ ok: true });

    // Throttle: si se solicitó recientemente, no reenviar aún
    const last: any = await Token.findOne({ email }).sort({ createdAt: -1 }).lean();
    if (last && Date.now() - new Date(last.createdAt).getTime() < COOLDOWN_MS) {
      return NextResponse.json({ ok: true });
    }

    await Token.deleteMany({ email });
    await Token.create({ email, token, expiresAt: new Date(expires) });

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const link = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

    // Transporte de correo
    const isProd = process.env.NODE_ENV === "production";
    let transporter;
    if (process.env.SMTP_HOST) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: process.env.SMTP_USER && process.env.SMTP_PASS ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });
    } else {
      // Modo dev: no SMTP, usar jsonTransport y mostrar link en logs
      transporter = nodemailer.createTransport({ jsonTransport: true } as any);
    }

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || "dev@example.com",
      to: email,
      subject: "Restablecer contraseña",
      text: `Usa este enlace para restablecer tu contraseña: ${link}`,
      html: `<p>Usa este enlace para restablecer tu contraseña:</p><p><a href="${link}">${link}</a></p>`,
    });

    if (!process.env.SMTP_HOST && !isProd) {
      // Exponer el enlace en respuesta para facilitar pruebas locales
      return NextResponse.json({ ok: true, debugLink: link, info });
    }
  } catch (e) {
    // no revelar errores
  }

  return NextResponse.json({ ok: true });
}
