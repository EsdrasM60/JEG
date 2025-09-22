import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import Project from "@/models/Project";

function parseParts(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // expected: ['api','projects','<projectId>','adicionales','<aid>']
  const projectId = parts[2];
  const aid = parts[4];
  return { projectId, aid };
}

export async function PATCH(req: Request) {
  try {
    await connectMongo();
    const { projectId, aid } = parseParts(req);
    const body = await req.json().catch(() => ({}));
    const p = await Project.findById(projectId);
    if (!p) return NextResponse.json({ error: "project not found" }, { status: 404 });

    const adicionales = (p as any).adicionales || [];
    if (!Array.isArray(adicionales)) return NextResponse.json({ error: "project adicionales invalid" }, { status: 400 });

    const idx = adicionales.findIndex((a: any) => String(a._id) === String(aid) || String(a.id) === String(aid));
    if (idx === -1) return NextResponse.json({ error: "adicional not found" }, { status: 404 });
    const item = adicionales[idx];

    const prevStatus = item.status;

    // Allow updating common fields
    if (body.title !== undefined) item.title = String(body.title);
    if (body.description !== undefined) item.description = body.description || undefined;
    if (body.cost !== undefined) item.cost = Number(body.cost) || 0;
    if (body.fecha !== undefined) {
      item.fecha = body.fecha
        ? (typeof body.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.fecha) ? new Date(`${body.fecha}T12:00:00Z`) : new Date(body.fecha))
        : undefined;
    }
    if (body.responsableId !== undefined) item.responsableId = body.responsableId || undefined;
    if (body.fotos !== undefined) {
      item.fotos = Array.isArray(body.fotos)
        ? body.fotos.map((f: any) => ({ mediaId: f?.mediaId, thumbId: f?.thumbId || undefined, titulo: f?.titulo || undefined }))
        : [];
    }
    if (body.status !== undefined) item.status = String(body.status);

    // assign back in case mongoose needs the parent array set
    (p as any).adicionales = adicionales;

    await p.save();

    // If status changed, create notification
    try {
      if (body.status !== undefined && String(body.status) !== String(prevStatus)) {
        const { default: Notification } = await import("@/models/Notification");
        await Notification.create({
          type: "ADICIONAL_STATUS",
          message: `Adicional "${item.title}" en proyecto ${projectId} cambió a ${String(item.status)}`,
          level: "info",
          meta: { projectId, adicionalId: String(item._id), status: item.status },
          createdBy: undefined,
          targetRoles: ["ADMIN", "COORDINADOR"],
        });
      }
    } catch (nerr: any) {
      console.warn("Notification create error:", nerr?.message || nerr);
    }

    return NextResponse.json(item);
  } catch (e: any) {
    console.error("PATCH /api/projects/[id]/adicionales/[aid] error:", e);
    return NextResponse.json({ error: e?.message || "Unexpected" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await connectMongo();
    const { projectId, aid } = parseParts(req);
    const p = await Project.findById(projectId);
    if (!p) return NextResponse.json({ error: "project not found" }, { status: 404 });

    const adicionales = (p as any).adicionales || [];
    if (!Array.isArray(adicionales)) return NextResponse.json({ error: "project adicionales invalid" }, { status: 400 });

    (p as any).adicionales = adicionales.filter((a: any) => String(a._id) !== String(aid) && String(a.id) !== String(aid));
    await p.save();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /api/projects/[id]/adicionales/[aid] error:", e);
    return NextResponse.json({ error: e?.message || "Unexpected" }, { status: 500 });
  }
}
