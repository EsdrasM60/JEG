import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import GlobalConfig from "@/models/GlobalConfig";

export async function GET() {
  await connectMongo();
  const cfg = (await GlobalConfig.findOne({ key: 'global' }).lean()) as any;
  // prefer empresas, fallback to congregaciones
  const empresas = cfg?.empresas?.length ? cfg.empresas : cfg?.congregaciones || [];
  return NextResponse.json({ empresas });
}

export async function POST(req: Request) {
  await connectMongo();
  const { empresas } = await req.json();
  if (!Array.isArray(empresas)) return NextResponse.json({ error: 'empresas debe ser array' }, { status: 400 });
  const doc = (await GlobalConfig.findOneAndUpdate(
    { key: 'global' },
    { $setOnInsert: { key: 'global' }, $set: { empresas } },
    { new: true, upsert: true }
  ).lean()) as any;
  return NextResponse.json({ empresas: doc?.empresas || empresas });
}
