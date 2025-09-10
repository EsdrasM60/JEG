import { Schema, models, model } from "mongoose";

const VolunteerSchema = new Schema(
  {
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    email: { type: String, index: true, unique: true, sparse: true },
    telefono: { type: String },
    congregacion: { type: String },
    empresa: { type: String }, // nueva propiedad compatible
    cargo: { type: String, enum: ["Supervisor", "Tecnico", "Contratista"], default: "Tecnico" },
    created_by: { type: String },
    shortId: { type: String, index: true, unique: true },
  },
  { timestamps: true }
);

const Volunteer = models.Volunteer || model("Volunteer", VolunteerSchema);
export default Volunteer;
