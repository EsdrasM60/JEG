import mongoose, { Schema } from "mongoose";

const ProgramaSchema = new Schema(
  {
    // fichaId ahora opcional: las tareas generales pueden no estar vinculadas a una ficha
    fichaId: { type: Schema.Types.ObjectId, ref: "Ficha", required: false, index: true },
    voluntarioId: { type: Schema.Types.ObjectId, ref: "Volunteer", required: true, index: true },
    ayudanteId: { type: Schema.Types.ObjectId, ref: "Volunteer", required: false, index: true },
    asignadoFecha: { type: Date, required: true, index: true },
    completadoFecha: { type: Date, index: true },
    notas: { type: String },
    fotos: [{ type: String }],
    created_by: { type: String },
  },
  { timestamps: true }
);

ProgramaSchema.index({ asignadoFecha: 1, completadoFecha: 1 });
ProgramaSchema.index({ createdAt: -1 });

// In dev mode the model may already be compiled; delete it so schema changes are applied
if ((mongoose as any).models && (mongoose as any).models.Programa) {
  try { delete (mongoose as any).models.Programa; } catch (e) { /* ignore */ }
}
export default (mongoose.models.Programa as mongoose.Model<any>) || mongoose.model("Programa", ProgramaSchema);
