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

// NUEVO: Cubicacion (partida)
const CubicacionSchema = new Schema(
  {
    code: { type: String },
    descripcion: { type: String, required: true },
    unidad: { type: String },
    cantidad: { type: Number, default: 0 },
    precioUnitario: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: true }
);

// NUEVO: Payment
const PaymentSchema = new Schema(
  {
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    method: { type: String },
    receiptId: { type: Schema.Types.ObjectId }, // GridFS id or external reference
    note: { type: String },
    createdBy: { type: String },
  },
  { _id: true }
);

// NUEVO: Adicional (change order)
const AdicionalSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    cost: { type: Number, default: 0 },
    status: { type: String, enum: ["PENDIENTE", "APROBADO", "RECHAZADO"], default: "PENDIENTE" },
    createdBy: { type: String },
    approvedBy: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// NUEVO: Weekly task
const WeeklyTaskSchema = new Schema(
  {
    weekStart: { type: Date, required: true },
    title: { type: String, required: true },
    description: { type: String },
    assigneeId: { type: Schema.Types.ObjectId, ref: "Volunteer" },
    status: { type: String, enum: ["todo", "doing", "done"], default: "todo" },
  },
  { _id: true }
);

const ProjectSchema = new Schema(
  {
    titulo: { type: String, required: true, index: true },
    descripcion: { type: String },
    // estado ampliado
    estado: {
      type: String,
      enum: ["PLANIFICADO", "EN_PROGRESO", "EN_PAUSA", "COMPLETADO", "CANCELADO"],
      default: "PLANIFICADO",
      index: true,
    },
    // mantengo compatibilidad con los campos existentes
    voluntarioId: { type: Schema.Types.ObjectId, ref: "Volunteer", required: false, index: true },
    ayudanteId: { type: Schema.Types.ObjectId, ref: "Volunteer", required: false, index: true },
    // nuevo campo supervisorId (alias de voluntarioId futuro)
    supervisorId: { type: Schema.Types.ObjectId, ref: "Volunteer", required: false, index: true },
    fechaInicio: { type: Date, required: false, index: true },
    fechaFin: { type: Date, required: false },
    etiquetas: { type: [String], default: [] },

    // Alcance / Scope
    scope: { type: String },

    // Presupuesto inicial
    initialBudget: {
      amount: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
      createdAt: { type: Date, default: Date.now },
    },

    // Cubicaciones embebidas
    cubicaciones: { type: [CubicacionSchema], default: [] },

    // Pagos
    payments: { type: [PaymentSchema], default: [] },

    // Adicionales (change orders)
    adicionales: { type: [AdicionalSchema], default: [] },

    // Tareas semanales
    weeklyTasks: { type: [WeeklyTaskSchema], default: [] },

    evidencias: { type: [EvidenciaSchema], default: [] },
    // Cambiado: lista de verificación con estado por ítem
    checklist: { type: [ChecklistItemSchema], default: [] },
    created_by: { type: String },
  },
  { timestamps: true }
);

ProjectSchema.index({ createdAt: -1 });

export default (mongoose.models.Project as mongoose.Model<any>) || mongoose.model("Project", ProjectSchema);
