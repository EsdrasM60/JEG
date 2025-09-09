import mongoose, { Schema } from "mongoose";

const ChecklistItemSchema = new Schema(
  {
    text: { type: String, required: true },
    done: { type: Boolean, default: false },
  },
  { _id: false }
);

const FichaSchema = new Schema(
  {
    titulo: { type: String, required: true },
    descripcion: { type: String },
    prioridad: { type: String, enum: ["BAJA", "MEDIA", "ALTA"], default: "MEDIA" },
    estado: { type: String, enum: ["ABIERTA", "EN_PROGRESO", "COMPLETADA"], default: "ABIERTA" },
    asignado_a: { type: String }, // email o nombre
    vencimiento: { type: Date },
    created_by: { type: String },
    pdfId: { type: Schema.Types.ObjectId, ref: "fs.files", required: false },
    instrucciones: { type: String },
    checklist: { type: [ChecklistItemSchema], default: [] },
    notas: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default (mongoose.models.Ficha as mongoose.Model<any>) || mongoose.model("Ficha", FichaSchema);
