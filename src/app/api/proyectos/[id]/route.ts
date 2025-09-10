import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import Project from "@/models/Project";

export async function PATCH(req: Request, context: any) {
  try {
    await connectMongo();
    const { params } = context as { params: Promise<{ id: string }> };
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    // Preparar operaciones sobre evidencias (no ejecutar todavía)
    let evidenciasToAdd = null;
    if (Array.isArray(body.addEvidencias) && body.addEvidencias.length > 0) {
      evidenciasToAdd = body.addEvidencias.map((e: any) => ({
        mediaId: e.mediaId,
        thumbId: e.thumbId || undefined,
        titulo: e.titulo || undefined,
        puntos: Array.isArray(e.puntos) ? e.puntos : [],
        created_by: body.actor || undefined,
        createdAt: new Date(),
      }));
    }

    if (Array.isArray(body.removeEvidenciaIds) && body.removeEvidenciaIds.length > 0) {
      // Validación simple: asegurar que los IDs a remover existan en la base de datos
      const project = await Project.findById(id);
      if (!project) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

      const evidenciasActuales = project.evidencias || [];
      const evidenciasAEliminar = body.removeEvidenciaIds.filter((id: string) =>
        evidenciasActuales.some((e: any) => e.mediaId === id)
      );

      if (evidenciasAEliminar.length === 0) {
        return NextResponse.json({ error: "No se encontraron evidencias para eliminar" }, { status: 400 });
      }

      let doc: any = null;
      doc = await Project.findByIdAndUpdate(
        id,
        { $pull: { evidencias: { mediaId: { $in: evidenciasAEliminar } } } },
        { new: true }
      ).lean();
      if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      return NextResponse.json(doc);
    }

    const updates: any = {};
    if ("titulo" in body) updates.titulo = body.titulo || null;
    if ("descripcion" in body) updates.descripcion = body.descripcion || null;
    if ("estado" in body) updates.estado = body.estado || "PLANIFICADO";
    if ("voluntarioId" in body) updates.voluntarioId = body.voluntarioId || null;
    if ("ayudanteId" in body) updates.ayudanteId = body.ayudanteId || null;
    if ("fechaInicio" in body) updates.fechaInicio = body.fechaInicio ? new Date(body.fechaInicio) : null;
    if ("fechaFin" in body) updates.fechaFin = body.fechaFin ? new Date(body.fechaFin) : null;
    if ("etiquetas" in body && Array.isArray(body.etiquetas)) updates.etiquetas = body.etiquetas;
    // NUEVO: actualizar checklist
    if ("checklist" in body) {
      updates.checklist = Array.isArray(body.checklist)
        ? body.checklist
            .map((item: any) => (typeof item === "string" ? { text: item, done: false } : { text: String(item?.text || ""), done: Boolean(item?.done) }))
            .filter((i: any) => i.text)
        : (typeof body.checklist === "string"
            ? body.checklist.split(/\r?\n|,|;/).map((s: string) => s.trim()).filter(Boolean).map((text: string) => ({ text, done: false }))
            : []);
    }

    // NUEVO: actualizar checklist por categorías
    if ("checklistCategories" in body) {
      updates.checklistCategories = Array.isArray(body.checklistCategories)
        ? body.checklistCategories.map((category: any) => ({
            title: String(category.title || ""),
            items: Array.isArray(category.items)
              ? category.items.map((item: any) => ({
                  text: String(item?.text || ""),
                  done: Boolean(item?.done)
                })).filter((i: any) => i.text)
              : [],
            isCollapsed: Boolean(category.isCollapsed),
            order: Number(category.order) || 0
          })).filter((cat: any) => cat.title)
        : [];
    }

    // NUEVO: actualizar bitácora
    if ("bitacora" in body && Array.isArray(body.bitacora)) {
      updates.bitacora = body.bitacora.map((entry: any) => ({
        fecha: new Date(entry.fecha),
        notas: String(entry.notas || ""),
        fotos: Array.isArray(entry.fotos) ? entry.fotos.map((foto: any) => ({
          mediaId: foto.mediaId,
          thumbId: foto.thumbId || undefined,
          titulo: foto.titulo || undefined,
          enEvidencia: Boolean(foto.enEvidencia)
        })) : [],
        createdBy: String(entry.createdBy || ""),
        createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date()
      }));
    }

    // Ejecutar actualizaciones normales
    let doc: any = null;
    doc = await Project.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    // Si hay evidencias que agregar, ejecutar esa operación también
    if (evidenciasToAdd && evidenciasToAdd.length > 0) {
      doc = await Project.findByIdAndUpdate(
        id,
        { $push: { evidencias: { $each: evidenciasToAdd } } },
        { new: true }
      ).lean();
      if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json(doc);
  } catch (e) {
    console.error("Error en PATCH /api/proyectos/[id]:", e);
    return NextResponse.json({ error: "Unexpected", details: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: any) {
  try {
    await connectMongo();
    const { params } = context as { params: Promise<{ id: string }> };
    const { id } = await params;
    const res = await Project.deleteOne({ _id: id });
    if (res.deletedCount === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Unexpected" }, { status: 500 });
  }
}

// Nuevo: obtener proyecto por id (con evidencias)
export async function GET(_req: Request, context: any) {
  try {
    await connectMongo();
    const { params } = context as { params: Promise<{ id: string }> };
    const { id } = await params;
    const doc = await Project.findById(id).lean();
    if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(doc);
  } catch (e) {
    return NextResponse.json({ error: "Unexpected" }, { status: 500 });
  }
}

// (handlers already implemented arriba)
