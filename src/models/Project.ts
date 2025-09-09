import mongoose, { Schema } from "mongoose";

const EvidenciaSchema = new Schema(
  {
    mediaId: { type: Schema.Types.ObjectId, required: true },
    thumbId: { type: Schema.Types.ObjectId, required: false },
    titulo: { type: String },
    puntos: { type: [String], default: [] },
    created_by: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// NUEVO: subesquema para checklist
const ChecklistItemSchema = new Schema(
  {
    text: { type: String, required: true },
    done: { type: Boolean, default: false },
  },
  { _id: false }
);

const ProjectSchema = new Schema(
  {
    titulo: { type: String, required: true, index: true },
    descripcion: { type: String },
    estado: { type: String, enum: ["PLANIFICADO", "EN_PROGRESO", "EN_PAUSA", "COMPLETADO"], default: "PLANIFICADO", index: true },
    voluntarioId: { type: Schema.Types.ObjectId, ref: "Volunteer", required: false, index: true },
    ayudanteId: { type: Schema.Types.ObjectId, ref: "Volunteer", required: false, index: true },
    fechaInicio: { type: Date, required: false, index: true },
    fechaFin: { type: Date, required: false },
    etiquetas: { type: [String], default: [] },
    evidencias: { type: [EvidenciaSchema], default: [] },
    // Cambiado: lista de verificación con estado por ítem
    checklist: { type: [ChecklistItemSchema], default: [] },
    created_by: { type: String },
  },
  { timestamps: true }
);

ProjectSchema.index({ createdAt: -1 });

export default (mongoose.models.Project as mongoose.Model<any>) || mongoose.model("Project", ProjectSchema);
