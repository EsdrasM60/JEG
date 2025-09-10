import { NextRequest, NextResponse } from "next/server";
import ChecklistTemplate from "@/models/ChecklistTemplate";
import { connectMongo } from "@/lib/mongo";

// GET - Obtener todas las plantillas
export async function GET() {
  try {
    await connectMongo();
    
    const templates = await ChecklistTemplate.find({
      isPublic: true
    }).sort({ category: 1, title: 1, createdAt: -1 });
    
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error obteniendo plantillas:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" }, 
      { status: 500 }
    );
  }
}

// POST - Crear nueva plantilla
export async function POST(request: NextRequest) {
  try {
    await connectMongo();
    
    const body = await request.json();
    const { title, description, category, items, createdBy } = body;
    
    if (!title || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Título e items son requeridos" }, 
        { status: 400 }
      );
    }
    
    const template = new ChecklistTemplate({
      title,
      description,
      category,
      items: items.map((item: any, index: number) => ({
        text: item.text,
        order: item.order || index
      })),
      createdBy,
      isPublic: true,
      usageCount: 0
    });
    
    await template.save();
    
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error creando plantilla:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" }, 
      { status: 500 }
    );
  }
}
