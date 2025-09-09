import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import Volunteer from "@/models/Volunteer";

export async function GET() {
  await connectMongo();
  const rows = await Volunteer.find({ $or: [{ empresa: { $ne: null } }, { congregacion: { $ne: null } }] }).select('empresa congregacion').lean();
  const set = new Set<string>();
  for (const r of rows) {
    const val = (r.empresa && typeof r.empresa === 'string') ? r.empresa : (r.congregacion && typeof r.congregacion === 'string') ? r.congregacion : null;
    if (val) set.add(val.trim());
  }
  return NextResponse.json({ empresas: Array.from(set).sort() });
}
