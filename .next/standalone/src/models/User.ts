import mongoose, { Schema, models, model } from "mongoose";

export type Role = "ADMIN" | "COORDINADOR" | "VOLUNTARIO";

const PreferencesSchema = new Schema(
  {
    theme: { type: String, enum: ["system", "light", "dark"], default: "system" },
    widgets: { type: [String], default: [] },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    name: { type: String },
    email: { type: String, unique: true, index: true, required: true },
    passwordHash: { type: String },
    role: { type: String, enum: ["ADMIN", "COORDINADOR", "VOLUNTARIO"], default: "VOLUNTARIO" },
    emailVerified: { type: Boolean, default: false },
    settings: { type: PreferencesSchema, default: () => ({}) },
  },
  { timestamps: true }
);

const User = models.User || model("User", UserSchema);
export default User;
