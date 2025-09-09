import mongoose, { Schema, models, model } from "mongoose";

const TaskSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    title: { type: String, required: true, index: true },
    description: { type: String },
    status: { type: String, enum: ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"], default: "TODO", index: true },
    priority: { type: Number, default: 3 },
    assigneeId: { type: Schema.Types.ObjectId, ref: "User", required: false, index: true },
    dueDate: { type: Date },
    metadata: { type: Schema.Types.Mixed },
    created_by: { type: String },
  },
  { timestamps: true }
);

TaskSchema.index({ createdAt: -1 });

const Task = models.Task || model("Task", TaskSchema);
export default Task;
