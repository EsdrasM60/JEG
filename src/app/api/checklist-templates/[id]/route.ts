import { NextRequest, NextResponse } from "next/server";
import ChecklistTemplate from "@/models/ChecklistTemplate";
import { connectMongo } from "@/lib/mongo";

// GET - Obtener plantilla específica
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    const { params } = context;
    const { id } = await params;
    
    const template = await ChecklistTemplate.findById(id);
    if (!template) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }
    
    return NextResponse.json(template);
  } catch (error) {
    console.error("Error obteniendo plantilla:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" }, 
      { status: 500 }
    );
  }
}

// PUT - Actualizar plantilla
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    const { params } = context;
    const { id } = await params;
    
    const body = await request.json();
    const { title, description, category, items } = body;
    
    const template = await ChecklistTemplate.findByIdAndUpdate(
      id,
      {
        title,
        description,
        category,
        items: items?.map((item: any, index: number) => ({
          text: item.text,
          order: item.order || index
        }))
      },
      { new: true }
    );
    
    if (!template) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }
    
    return NextResponse.json(template);
  } catch (error) {
    console.error("Error actualizando plantilla:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" }, 
      { status: 500 }
    );
  }
}

// DELETE - Eliminar plantilla
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    const { params } = context;
    const { id } = await params;
    
    const template = await ChecklistTemplate.findByIdAndDelete(id);
    if (!template) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }
    
    return NextResponse.json({ message: "Plantilla eliminada correctamente" });
  } catch (error) {
    console.error("Error eliminando plantilla:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" }, 
      { status: 500 }
    );
  }
}
