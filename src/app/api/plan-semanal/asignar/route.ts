import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PlanSemanal from "@/models/PlanSemanal";

export async function POST(req: Request) {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ error: 'MONGODB_URI no definido' }, { status: 400 });
  }
  await connectMongo();
  const { year, month, slot, plantilla, congregacion, tareas } = await req.json();
  if (!year || !month || !slot) return NextResponse.json({ error: "Campos requeridos: year, month, slot" }, { status: 400 });

  const pushDoc: any = { slot, year, month, completado: false };
  if (plantilla) pushDoc.plantilla = plantilla;
  if (congregacion) pushDoc.congregacion = congregacion;
  if (Array.isArray(tareas)) pushDoc.tareas = tareas;

  const doc = await PlanSemanal.findOneAndUpdate(
    { year, month },
    { $setOnInsert: { year, month }, $push: { asignaciones: pushDoc } },
    { new: true, upsert: true }
  ).lean();
  return NextResponse.json({ item: doc });
}

export async function PATCH(req: Request) {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ error: 'MONGODB_URI no definido' }, { status: 400 });
  }
  await connectMongo();
  const { year, month, slot, plantilla, congregacion, tareas, completado, notas } = await req.json();
  if (!year || !month || !slot) return NextResponse.json({ error: "Campos requeridos: year, month, slot" }, { status: 400 });

  const set: any = {};
  if (typeof plantilla !== 'undefined') set["asignaciones.$.plantilla"] = plantilla;
  if (typeof congregacion !== 'undefined') set["asignaciones.$.congregacion"] = congregacion;
  if (typeof tareas !== 'undefined') set["asignaciones.$.tareas"] = Array.isArray(tareas) ? tareas : [];
  if (typeof completado !== 'undefined') set["asignaciones.$.completado"] = !!completado;
  if (typeof notas !== 'undefined') set["asignaciones.$.notas"] = notas;

  const doc = await PlanSemanal.findOneAndUpdate(
    { year, month, "asignaciones.slot": slot },
    { $set: set },
    { new: true }
  ).lean();
  return NextResponse.json({ item: doc });
}
