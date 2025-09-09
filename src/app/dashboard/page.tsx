import { auth, role as RoleEnum } from "@/lib/auth";
import ProgramasPendientesWidget from "./ProgramasPendientesWidget";
import ProyectosWidget from "./ProyectosWidget";
import { headers } from "next/headers";

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name || session?.user?.email || "";
  const userRole = (session?.user as any)?.role as string | undefined;
  const isAdmin = userRole === RoleEnum.ADMIN;
  const settings = ((session?.user as any)?.settings || {}) as { widgets?: string[] };
  const allowed = Array.isArray(settings.widgets) && settings.widgets.length > 0 ? new Set(settings.widgets) : null;

  const now = new Date();
  const yy = now.getFullYear();
  const base = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${process.env.PORT || 3000}`);

  // Programa pendientes (compacto, sin count, menos pageSize)
  const urlProg = `${base}/api/tareas/programa?page=1&pageSize=200&pending=1&year=${yy}&compact=1&count=0`;
  const resProg = await fetch(urlProg, { next: { revalidate: 15 } }).catch(() => null);
  const dataProg = (await resProg?.json().catch(() => null)) as any;
  const programas = (dataProg?.items || []) as any[];

  // Voluntarios
  const hdrs = await headers();
  const cookieHeader = hdrs.get("cookie") ?? "";
  const resVol = await fetch(`${base}/api/voluntarios`, { next: { revalidate: 60 }, headers: { cookie: cookieHeader } }).catch(() => null);
  const volList = (await resVol?.json().catch(() => null)) as Array<{ id?: string; _id?: string; nombre?: string; apellido?: string }> | null;
  const volMap = new Map<string, string>();
  (Array.isArray(volList) ? volList : []).forEach((v) => {
    const id = String(v._id || v.id || "");
    if (id) volMap.set(id, `${v.nombre || ""} ${v.apellido || ""}`.trim());
  });

  // Proyectos resumen
  const urlPro = `${base}/api/proyectos?page=1&pageSize=100`;
  const resPro = await fetch(urlPro, { next: { revalidate: 30 } }).catch(() => null);
  const dataPro = (await resPro?.json().catch(() => null)) as { items?: any[] } | null;
  const proyectos = (dataPro?.items || []).map((p: any) => ({
    _id: String(p._id),
    titulo: p.titulo as string,
    descripcion: p.descripcion ?? null,
    estado: (p.estado || "PLANIFICADO") as any,
    voluntario: p.voluntarioId ? volMap.get(String(p.voluntarioId)) || "" : null,
    ayudante: p.ayudanteId ? volMap.get(String(p.ayudanteId)) || "" : null,
    fechaInicio: p.fechaInicio ?? null,
    fechaFin: p.fechaFin ?? null,
    checklist: Array.isArray(p.checklist) ? p.checklist : [],
  }));

  return (
    <section className="relative min-h-[60vh]">
      {/* Background logo centered and behind content */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <img src="/Logo%20JEG.jpg" alt="" className="max-w-[60%] opacity-10 dark:opacity-5 object-contain" />
      </div>

      <div className="relative z-10 space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {(!allowed || allowed.has("dashboard:programas")) && (
            <div>
              <ProgramasPendientesWidget items={programas} isAdmin={isAdmin} userName={userName} />
            </div>
          )}
          {(!allowed || allowed.has("dashboard:proyectos")) && (
            <div>
              <ProyectosWidget items={proyectos} isAdmin={isAdmin} userName={userName} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
