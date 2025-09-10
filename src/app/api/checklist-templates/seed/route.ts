import { NextRequest, NextResponse } from "next/server";
import ChecklistTemplate from "@/models/ChecklistTemplate";
import { connectMongo } from "@/lib/mongo";

const defaultTemplates = [
  {
    title: "Obra Gris",
    description: "Lista de verificación para trabajos de construcción básica y estructura",
    category: "Construcción",
    items: [
      { text: "Verificar fundaciones y cimentación", order: 1 },
      { text: "Revisar estructura de columnas", order: 2 },
      { text: "Inspeccionar vigas y losas", order: 3 },
      { text: "Verificar muros de mampostería", order: 4 },
      { text: "Revisar impermeabilización", order: 5 },
      { text: "Inspeccionar drenajes", order: 6 },
      { text: "Verificar niveles y plomadas", order: 7 },
      { text: "Revisar acabados de concreto", order: 8 }
    ]
  },
  {
    title: "Alambrado Eléctrico",
    description: "Checklist para instalaciones eléctricas residenciales y comerciales",
    category: "Eléctrico",
    items: [
      { text: "Verificar tablero principal", order: 1 },
      { text: "Revisar breakers y fusibles", order: 2 },
      { text: "Inspeccionar cableado general", order: 3 },
      { text: "Verificar tomas de corriente", order: 4 },
      { text: "Revisar interruptores", order: 5 },
      { text: "Inspeccionar luminarias", order: 6 },
      { text: "Verificar conexión a tierra", order: 7 },
      { text: "Probar circuitos eléctricos", order: 8 },
      { text: "Revisar acometida eléctrica", order: 9 },
      { text: "Verificar medidor eléctrico", order: 10 }
    ]
  },
  {
    title: "Plomería y Sanitarios",
    description: "Lista de verificación para instalaciones de agua potable y drenaje",
    category: "Plomería",
    items: [
      { text: "Verificar tubería de agua potable", order: 1 },
      { text: "Revisar sistema de drenaje", order: 2 },
      { text: "Inspeccionar conexiones", order: 3 },
      { text: "Verificar presión de agua", order: 4 },
      { text: "Revisar válvulas y llaves", order: 5 },
      { text: "Inspeccionar inodoros", order: 6 },
      { text: "Verificar lavamanos", order: 7 },
      { text: "Revisar ducha/bañera", order: 8 },
      { text: "Inspeccionar tanque de agua", order: 9 },
      { text: "Verificar bomba de agua", order: 10 }
    ]
  },
  {
    title: "Acabados y Pintura",
    description: "Checklist para trabajos de acabados finales y pintura",
    category: "Acabados",
    items: [
      { text: "Preparar superficies", order: 1 },
      { text: "Aplicar masilla y resane", order: 2 },
      { text: "Lijar superficies", order: 3 },
      { text: "Aplicar primera mano de pintura", order: 4 },
      { text: "Revisar uniformidad", order: 5 },
      { text: "Aplicar segunda mano", order: 6 },
      { text: "Instalar molduras", order: 7 },
      { text: "Colocar cerrajería", order: 8 },
      { text: "Limpieza final", order: 9 }
    ]
  },
  {
    title: "Pisos y Ceramica",
    description: "Lista de verificación para instalación de pisos y revestimientos",
    category: "Acabados",
    items: [
      { text: "Preparar contrapiso", order: 1 },
      { text: "Verificar nivel del piso", order: 2 },
      { text: "Aplicar impermeabilizante", order: 3 },
      { text: "Colocar ceramica/baldosas", order: 4 },
      { text: "Verificar alineación", order: 5 },
      { text: "Aplicar fragua", order: 6 },
      { text: "Limpiar juntas", order: 7 },
      { text: "Instalar zócalos", order: 8 },
      { text: "Pulir y sellar", order: 9 }
    ]
  }
];

// POST - Crear plantillas predeterminadas (solo para inicialización)
export async function POST() {
  try {
    await connectMongo();
    
    // Verificar si ya existen plantillas
    const existingCount = await ChecklistTemplate.countDocuments();
    if (existingCount > 0) {
      return NextResponse.json({ 
        message: `Ya existen ${existingCount} plantillas en la base de datos` 
      });
    }
    
    const createdTemplates = [];
    
    for (const template of defaultTemplates) {
      const newTemplate = new ChecklistTemplate({
        ...template,
        isPublic: true,
        createdBy: 'system',
        usageCount: 0
      });
      
      await newTemplate.save();
      createdTemplates.push(newTemplate);
    }
    
    return NextResponse.json({ 
      message: `Se crearon ${createdTemplates.length} plantillas predeterminadas`,
      templates: createdTemplates 
    }, { status: 201 });
    
  } catch (error) {
    console.error("Error creando plantillas predeterminadas:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" }, 
      { status: 500 }
    );
  }
}
