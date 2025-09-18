import mongoose, { Schema } from "mongoose";

const NotificationSchema = new Schema(
  {
    type: { type: String, required: true, index: true },
    message: { type: String, required: true },
    level: { type: String, enum: ["info", "warning", "danger"], default: "info" },
    meta: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false },
    resolved: { type: Boolean, default: false },
    createdBy: { type: String },
    targetRoles: { type: [String], default: ["ADMIN"] },
  },
  { timestamps: true }
);

NotificationSchema.index({ createdAt: -1 });

export default (mongoose.models.Notification as mongoose.Model<any>) ||
  mongoose.model("Notification", NotificationSchema);
