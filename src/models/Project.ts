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

// NUEVO: Checklist categorizado
const ChecklistCategorySchema = new Schema(
  {
    title: { type: String, required: true }, // ej: "Obra Gris", "Alambrado"
    items: { type: [ChecklistItemSchema], default: [] },
    isCollapsed: { type: Boolean, default: false },
    order: { type: Number, default: 0 }, // para ordenar las categorías
  },
  { _id: true }
);

// NUEVO: Presupuesto aprobado detallado
const PresupuestoSchema = new Schema(
  {
    materiales: { type: Number, default: 0 },
    manoDeObra: { type: Number, default: 0 },
    direccionTecnica: { type: Number, default: 0 },
    indirectos: { type: Number, default: 0 },
    itbis: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
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

// NUEVO: Bitácora entry
const BitacoraEntrySchema = new Schema(
  {
    fecha: { type: Date, required: true },
    notas: { type: String, required: true },
    fotos: [{
      mediaId: { type: Schema.Types.ObjectId, required: true },
      thumbId: { type: Schema.Types.ObjectId, required: false },
      titulo: { type: String },
      enEvidencia: { type: Boolean, default: false }
    }],
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
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

    // Presupuesto aprobado detallado
    presupuesto: { type: PresupuestoSchema, required: false },

    // Cubicaciones embebidas
    cubicaciones: { type: [CubicacionSchema], default: [] },

    // Pagos
    payments: { type: [PaymentSchema], default: [] },

    // Adicionales (change orders)
    adicionales: { type: [AdicionalSchema], default: [] },

    // Tareas semanales
    weeklyTasks: { type: [WeeklyTaskSchema], default: [] },

    evidencias: { type: [EvidenciaSchema], default: [] },
    // Bitácora de actividades
    bitacora: { type: [BitacoraEntrySchema], default: [] },
    // Checklist categorizado y lista legacy para compatibilidad
    checklistCategories: { type: [ChecklistCategorySchema], default: [] },
    checklist: { type: [ChecklistItemSchema], default: [] }, // mantener compatibilidad
    created_by: { type: String },
  },
  { timestamps: true }
);

ProjectSchema.index({ createdAt: -1 });

export default (mongoose.models.Project as mongoose.Model<any>) || mongoose.model("Project", ProjectSchema);
