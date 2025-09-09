import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import GlobalConfig from "@/models/GlobalConfig";

export async function GET() {
  await connectMongo();
  const cfg = (await GlobalConfig.findOne({ key: 'global' }).lean()) as any;
  return NextResponse.json({ congregaciones: cfg?.congregaciones || [], empresas: cfg?.empresas || [] });
}

export async function POST(req: Request) {
  await connectMongo();
  const { congregaciones, empresas } = await req.json();
  if (!Array.isArray(congregaciones) && !Array.isArray(empresas)) return NextResponse.json({ error: 'congregaciones o empresas debe ser array' }, { status: 400 });
  const doc = (await GlobalConfig.findOneAndUpdate(
    { key: 'global' },
    { $setOnInsert: { key: 'global' }, $set: { congregaciones: congregaciones || [], empresas: empresas || [] } },
    { new: true, upsert: true }
  ).lean()) as any;
  return NextResponse.json({ congregaciones: doc?.congregaciones || [], empresas: doc?.empresas || [] });
}
