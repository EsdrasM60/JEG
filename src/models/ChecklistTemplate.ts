import mongoose, { Schema } from "mongoose";

// Esquema para items de checklist en plantillas
const TemplateChecklistItemSchema = new Schema(
  {
    text: { type: String, required: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

// Esquema para plantillas de checklist
const ChecklistTemplateSchema = new Schema(
  {
    title: { type: String, required: true, index: true }, // ej: "Obra Gris", "Alambrado Eléctrico"
    description: { type: String }, // descripción de la plantilla
    category: { type: String }, // categoría general (ej: "Construcción", "Eléctrico", "Plomería")
    items: { type: [TemplateChecklistItemSchema], default: [] },
    isPublic: { type: Boolean, default: true }, // si está disponible para todos los proyectos
    createdBy: { type: String }, // usuario que creó la plantilla
    usageCount: { type: Number, default: 0 }, // contador de cuántas veces se ha usado
  },
  { timestamps: true }
);

ChecklistTemplateSchema.index({ title: 1, category: 1 });
ChecklistTemplateSchema.index({ createdAt: -1 });

export default (mongoose.models.ChecklistTemplate as mongoose.Model<any>) || 
  mongoose.model("ChecklistTemplate", ChecklistTemplateSchema);
