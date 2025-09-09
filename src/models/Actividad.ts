import { Schema, models, model } from "mongoose";

const FotoSchema = new Schema(
  {
    mediaId: { type: String, required: true }, // almacenado en GridFS o similar
    url: { type: String },
    caption: { type: String },
    comentarios: [
      {
        authorId: { type: String },
        text: { type: String },
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { _id: true }
);

const BitacoraEntry = new Schema(
  {
    date: { type: Date, default: Date.now },
    authorId: { type: String },
    text: { type: String },
  },
  { _id: false }
);

const ComentarioSchema = new Schema(
  {
    authorId: { type: String },
    text: { type: String },
    date: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ActividadSchema = new Schema(
  {
    projectId: { type: String, required: true, index: true },
    supervisorId: { type: String, required: true, index: true },
    fecha: { type: Date, default: Date.now, index: true },
    titulo: { type: String },
    tipo: { type: String },
    descripcion: { type: String },
    fotos: [FotoSchema],
    comentariosProyecto: [ComentarioSchema],
    bitacora: [BitacoraEntry],
    evaluacion: {
      score: { type: Number, min: 0, max: 5 },
      tags: [String],
      visualSummary: { type: String },
    },
  },
  { timestamps: true }
);

const Actividad = models.Actividad || model("Actividad", ActividadSchema);
export default Actividad;
