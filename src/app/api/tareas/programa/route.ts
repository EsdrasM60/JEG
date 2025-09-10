import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import Programa from "@/models/Programa";

export async function GET(req: Request) {
  await connectMongo();

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 1000);
  const skip = (page - 1) * pageSize;
  const year = parseInt(searchParams.get("year") || "");
  const pending = (searchParams.get("pending") || "").toLowerCase() === "1";
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const compact = (searchParams.get("compact") || "").toLowerCase() === "1";
  const doCount = (searchParams.get("count") || "1").toLowerCase() !== "0";

  const match: any = {};
  const range: any = {};
  if (from) {
    const d = new Date(from);
    if (!isNaN(d.getTime())) range.$gte = d;
  }
  if (to) {
    const d = new Date(to);
    if (!isNaN(d.getTime())) range.$lt = d;
  }

  if (!isNaN(year)) {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    if (pending) {
      match.$and = [
        { $or: [{ completadoFecha: { $exists: false } }, { completadoFecha: null }] },
        { asignadoFecha: { $gte: start, $lt: end } },
      ];
    } else {
      match.$or = [
        { completadoFecha: { $gte: start, $lt: end } },
        {
          $and: [
            { $or: [{ completadoFecha: { $exists: false } }, { completadoFecha: null }] },
            { asignadoFecha: { $gte: start, $lt: end } },
          ],
        },
      ];
    }
  }

  if (Object.keys(range).length > 0) {
    match.asignadoFecha = { ...(match.asignadoFecha || {}), ...range };
  }

  let query = Programa.find(match)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .lean();

  if (compact) {
    query = query.select({ fichaId: 1, voluntarioId: 1, ayudanteId: 1, asignadoFecha: 1, completadoFecha: 1, notas: 1 });
  }

  query = query
    .populate({ path: "fichaId", select: compact ? "titulo" : "titulo pdfId" })
    .populate({ path: "voluntarioId", select: "nombre apellido shortId" })
    .populate({ path: "ayudanteId", select: "nombre apellido shortId" });

  const [items, total] = await Promise.all([
    query,
    doCount ? Programa.countDocuments(match) : Promise.resolve(-1),
  ]);

  // map compatibility fields: supervisorId <-> voluntarioId, tecnicoId <-> ayudanteId
  const itemsMapped = (items || []).map((it: any) => ({
    ...it,
    supervisorId: it.voluntarioId ?? null,
    tecnicoId: it.ayudanteId ?? null,
  }));

  return NextResponse.json({ items: itemsMapped, total: doCount ? total : undefined, page, pageSize });
}

export async function POST(req: Request) {
  await connectMongo();

  const body = await req.json();
  // accept supervisorId / tecnicoId as aliases
  if (body.supervisorId && !body.voluntarioId) body.voluntarioId = body.supervisorId;
  if (body.tecnicoId && !body.ayudanteId) body.ayudanteId = body.tecnicoId;

  // Require supervisor (voluntario) and asignadoFecha; fichaId is optional for general tasks
  if (!body.voluntarioId || !body.asignadoFecha) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  try {
    const prog = await Programa.create({
      fichaId: body.fichaId || null,
      voluntarioId: body.voluntarioId,
      ayudanteId: body.ayudanteId || null,
      asignadoFecha: new Date(body.asignadoFecha),
      completadoFecha: body.completadoFecha ? new Date(body.completadoFecha) : null,
      notas: body.notas || null,
      fotos: Array.isArray(body.fotos) ? body.fotos : [],
    });

    const resObj = (prog as any).toObject ? (prog as any).toObject() : prog;
    resObj.supervisorId = resObj.voluntarioId ?? null;
    resObj.tecnicoId = resObj.ayudanteId ?? null;
    return NextResponse.json(resObj);
  } catch (err: any) {
    // Return a useful error message for the client
    const message = err?.message || String(err) || "Error creando programa";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
