import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import Volunteer from "@/models/Volunteer";

export async function GET() {
  await connectMongo();
  const rows = await Volunteer.find({ $or: [{ congregacion: { $ne: null } }, { empresa: { $ne: null } }] }).select('congregacion empresa').lean();
  const set = new Set<string>();
  for (const r of rows) {
    if (r.congregacion && typeof r.congregacion === 'string') set.add(r.congregacion.trim());
    if (r.empresa && typeof r.empresa === 'string') set.add(r.empresa.trim());
  }
  return NextResponse.json({ congregaciones: Array.from(set).sort(), empresas: Array.from(set).sort() });
}
