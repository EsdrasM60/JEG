import mongoose, { Schema } from "mongoose";

const MinimalFichaSchema = new Schema(
  {
    titulo: { type: String, required: true },
  },
  { timestamps: true }
);

export default (mongoose.models.Ficha as mongoose.Model<any>) || mongoose.model("Ficha", MinimalFichaSchema);
