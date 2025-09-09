import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PlanSemanal from "@/models/PlanSemanal";

export async function GET(req: Request) {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ item: null, error: 'MONGODB_URI no definido' }, { status: 400 });
  }
  await connectMongo();
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

  const doc = await PlanSemanal.findOne({ year, month }).lean();
  return NextResponse.json({ item: doc });
}

export async function POST(req: Request) {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ item: null, error: 'MONGODB_URI no definido' }, { status: 400 });
  }
  await connectMongo();
  const body = await req.json();
  const { year, month } = body;
  if (!year || !month) return NextResponse.json({ error: "year y month requeridos" }, { status: 400 });

  const update: any = { $setOnInsert: { year, month } };

  const doc = await PlanSemanal.findOneAndUpdate({ year, month }, update, { new: true, upsert: true }).lean();
  return NextResponse.json({ item: doc });
}
