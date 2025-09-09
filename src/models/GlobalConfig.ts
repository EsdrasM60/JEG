import mongoose, { Schema } from "mongoose";

const GlobalConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'global' },
    congregaciones: { type: [String], default: [] },
    empresas: { type: [String], default: [] }, // soporte nuevo
  },
  { timestamps: true }
);

GlobalConfigSchema.index({ key: 1 }, { unique: true });

export type TGlobalConfig = {
  key: string;
  congregaciones: string[];
  empresas: string[];
};

export default (mongoose.models.GlobalConfig as mongoose.Model<any>) || mongoose.model("GlobalConfig", GlobalConfigSchema);
