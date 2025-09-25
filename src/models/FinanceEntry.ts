import mongoose from "mongoose";

const FinanceEntrySchema = new mongoose.Schema({
  fecha: { type: Date, required: true },
  tipo: { type: String, enum: ["INGRESO", "GASTO"], required: true },
  monto: { type: Number, required: true },
  categoria: { type: String, default: "" },
  proyectoId: { type: String, default: undefined },
  subContratistaId: { type: String, default: undefined },
  nota: { type: String, default: undefined },
  metadata: { type: mongoose.Schema.Types.Mixed, default: undefined },
  createdAt: { type: Date, default: Date.now }
});

const FinanceEntry = (mongoose.models && (mongoose.models.FinanceEntry as mongoose.Model<any>)) || mongoose.model("FinanceEntry", FinanceEntrySchema);
export default FinanceEntry;
