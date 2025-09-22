import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import Project from "@/models/Project";

function extractId(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 2]; // /api/projects/{id}/adicionales
}

export async function POST(req: Request) {
  try {
    await connectMongo();
    const projectId = extractId(req);
    const body = await req.json().catch(() => ({}));
    if (!body.title) return NextResponse.json({ error: "title required" }, { status: 400 });
    const p = await Project.findById(projectId);
    if (!p) return NextResponse.json({ error: "project not found" }, { status: 404 });
    const adicional: any = {
      title: String(body.title),
      description: body.description || undefined,
      cost: Number(body.cost) || 0,
      fecha: body.fecha ? (typeof body.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.fecha) ? new Date(`${body.fecha}T12:00:00Z`) : new Date(body.fecha)) : undefined,
      responsableId: body.responsableId || undefined,
      createdBy: body.actor || undefined,
      fotos: Array.isArray(body.fotos) ? body.fotos.map((f: any) => ({ mediaId: f.mediaId, thumbId: f.thumbId || undefined, titulo: f.titulo || undefined })) : [],
    };
    (p as any).adicionales.push(adicional);
    await p.save();
    const last = (p as any).adicionales[(p as any).adicionales.length - 1];

    // Create notification for admins/coordinators about new adicional pending approval
    try {
      const { default: Notification } = await import("@/models/Notification");
      await Notification.create({
        type: "ADICIONAL_CREATED",
        message: `Nuevo adicional pendiente en proyecto ${projectId}: ${last.title}`,
        level: "warning",
        meta: { projectId, adicionalId: String(last._id) },
        createdBy: body.actor || undefined,
        targetRoles: ["ADMIN", "COORDINADOR"],
      });
    } catch (nerr) {
      // ignore notification errors
      console.warn("Notification create error:", nerr);
    }

    return NextResponse.json(last);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Unexpected" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await connectMongo();
    const projectId = extractId(req);
    const p = await Project.findById(projectId).lean();
    if (!p) return NextResponse.json({ error: "project not found" }, { status: 404 });
    return NextResponse.json((p as any).adicionales || []);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Unexpected" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await connectMongo();
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const projectId = parts[parts.length - 3]; // /api/projects/{id}/adicionales/{aid}
    const aid = parts[parts.length - 1];
    const body = await req.json().catch(() => ({}));
    const p = await Project.findById(projectId);
    if (!p) return NextResponse.json({ error: "project not found" }, { status: 404 });
    const idx = (p as any).adicionales.findIndex((a: any) => String(a._id) === String(aid) || String(a.id) === String(aid));
    if (idx === -1) return NextResponse.json({ error: "adicional not found" }, { status: 404 });
    const item = (p as any).adicionales[idx];

    const prevStatus = item.status;
    if (body.status) item.status = String(body.status);
    if (body.fecha) item.fecha = new Date(body.fecha);
    if (body.responsableId) item.responsableId = body.responsableId;
    await p.save();

    // If status changed, create a notification for admins/coordinators
    try {
      if (body.status && String(body.status) !== String(prevStatus)) {
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
    } catch (nerr) {
      console.warn("Notification create error:", nerr);
    }

    return NextResponse.json(item);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Unexpected" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await connectMongo();
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const projectId = parts[parts.length - 3]; // /api/projects/{id}/adicionales/{aid}
    const aid = parts[parts.length - 1];
    const p = await Project.findById(projectId);
    if (!p) return NextResponse.json({ error: "project not found" }, { status: 404 });
    (p as any).adicionales = (p as any).adicionales.filter((a: any) => String(a._id) !== String(aid) && String(a.id) !== String(aid));
    await p.save();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Unexpected" }, { status: 500 });
  }
}
