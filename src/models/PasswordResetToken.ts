import mongoose, { Schema, models, model } from "mongoose";

const PasswordResetTokenSchema = new Schema(
  {
    email: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);

export default models.PasswordResetToken || model("PasswordResetToken", PasswordResetTokenSchema);
