import mongoose, { Schema } from "mongoose";

const AsignacionSchema = new Schema(
  {
    // Semana del mes (1..5) en la que se realizará la limpieza
    slot: { type: Number, enum: [1, 2, 3, 4, 5], required: true, index: true },

    // Plantilla (1..5) que define el conjunto de tareas de la guía
    plantilla: { type: Number, enum: [1, 2, 3, 4, 5] },

    // Compatibilidad con datos previos (usado como plantilla)
    semana: { type: Number, enum: [1, 2, 3, 4, 5] },

    congregacion: { type: String },
    year: { type: Number, required: true, index: true },
    month: { type: Number, required: true, index: true }, // 1..12
    completado: { type: Boolean, default: false, index: true },
    notas: { type: String },

    // Áreas seleccionadas a realizar en esta ocasión (coinciden con PLAN_SEMANAL[t].tareas[].area)
    tareas: { type: [String], default: [] },
  },
  { _id: false }
);

const PlanSemanalSchema = new Schema(
  {
    year: { type: Number, required: true, index: true },
    month: { type: Number, required: true, index: true },
    asignaciones: { type: [AsignacionSchema], default: [] },
  },
  { timestamps: true }
);

PlanSemanalSchema.index({ year: 1, month: 1 }, { unique: true });

export default (mongoose.models.PlanSemanal as mongoose.Model<any>) || mongoose.model("PlanSemanal", PlanSemanalSchema);
