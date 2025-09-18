// Central registration of mongoose models to avoid MissingSchemaError due to module load order / HMR
// Import models so mongoose.model(...) runs for each one. Keep imports side-effect-only.
import "@/models/User";
import "@/models/Volunteer";
import "@/models/Ficha";
import "@/models/Programa";
import "@/models/Project";
import "@/models/MediaNote";
import "@/models/Task";
import "@/models/GlobalConfig";
import "@/models/PasswordResetToken";
import "@/models/ChecklistTemplate";
import "@/models/PlanSemanal";
import "@/models/Actividad";

// Export nothing; importing this module has the side-effect of registering models
export default true;
