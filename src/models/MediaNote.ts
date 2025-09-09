import mongoose, { Schema } from "mongoose";

const MediaNoteSchema = new Schema(
  {
    mediaId: { type: Schema.Types.ObjectId, required: true, index: true }, // id en GridFS (uploads)
    thumbId: { type: Schema.Types.ObjectId, required: false },
    titulo: { type: String },
    nota: { type: String },
    voluntarioId: { type: Schema.Types.ObjectId, ref: "Volunteer", required: false, index: true },
    ayudanteId: { type: Schema.Types.ObjectId, ref: "Volunteer", required: false, index: true },
    fecha: { type: Date, default: Date.now, index: true },
    etiquetas: { type: [String], default: [] },
    created_by: { type: String },
  },
  { timestamps: true }
);

export default (mongoose.models.MediaNote as mongoose.Model<any>) || mongoose.model("MediaNote", MediaNoteSchema);
