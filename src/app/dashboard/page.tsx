import { auth, role as RoleEnum } from "@/lib/auth";
import ProgramasPendientesWidget from "./ProgramasPendientesWidget";
import ProyectosWidget from "./ProyectosWidget";
import WidgetSelector from "./WidgetSelector";
import FinanzasWidget from "./FinanzasWidget";
import { headers } from "next/headers";

export const dynamic = 'force-dynamic';

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

  // Programa pendientes (compacto, sin count, sin filtro por año)
  const urlProg = `${base}/api/tareas/programa?page=1&pageSize=200&pending=1&compact=1&count=0`;
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

  // If not admin, compute volunteer IDs that match current session user name so we can filter programas/proyectos server-side
  const currentName = (userName || "").trim().toLowerCase();
  const userVolunteerIds = new Set<string>();
  if (!isAdmin && currentName && Array.isArray(volList)) {
    for (const v of volList) {
      const id = String(v._id || v.id || "");
      const full = `${v.nombre || ""} ${v.apellido || ""}`.trim().toLowerCase();
      if (!id) continue;
      if (!full) continue;
      // consider exact match or contains
      if (full === currentName || full.includes(currentName) || currentName.includes(full)) {
        userVolunteerIds.add(id);
      }
    }
  }

  // Proyectos resumen
  const urlPro = `${base}/api/proyectos?page=1&pageSize=100`;
  const resPro = await fetch(urlPro, { next: { revalidate: 30 } }).catch(() => null);
  const dataPro = (await resPro?.json().catch(() => null)) as { items?: any[] } | null;
  const proyectosAll = (dataPro?.items || []).map((p: any) => ({
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

  // Apply server-side filtering for proyectos and programas: non-admins only see items where they are voluntario/ayudante
  const proyectos = isAdmin
    ? proyectosAll
    : proyectosAll.filter((p) => {
        const full = currentName;
        const volName = (p.voluntario || "").toLowerCase();
        const ayudName = (p.ayudante || "").toLowerCase();
        if (volName && (volName === full || volName.includes(full) || full.includes(volName))) return true;
        if (ayudName && (ayudName === full || ayudName.includes(full) || full.includes(ayudName))) return true;
        return false;
      });

  const programasFiltered = isAdmin
    ? programas
    : programas.filter((it: any) => {
        // programas from compact query may have voluntarioId/ayudanteId populated as objects or as ids
        const v = it.voluntarioId;
        const a = it.ayudanteId;
        // check by populated name
        const vName = v && (typeof v === 'object') ? `${v.nombre || ''} ${v.apellido || ''}`.trim().toLowerCase() : (v ? (volMap.get(String(v)) || '').toLowerCase() : '');
        const aName = a && (typeof a === 'object') ? `${a.nombre || ''} ${a.apellido || ''}`.trim().toLowerCase() : (a ? (volMap.get(String(a)) || '').toLowerCase() : '');
        if (vName && (vName === currentName || vName.includes(currentName) || currentName.includes(vName))) return true;
        if (aName && (aName === currentName || aName.includes(currentName) || currentName.includes(aName))) return true;
        // fallback: if we resolved volunteer ids that match user, check ids
        const vId = (it.voluntarioId && typeof it.voluntarioId === 'object') ? String(it.voluntarioId._id || it.voluntarioId.id || '') : String(it.voluntarioId || '');
        const aId = (it.ayudanteId && typeof it.ayudanteId === 'object') ? String(it.ayudanteId._id || it.ayudanteId.id || '') : String(it.ayudanteId || '');
        if (userVolunteerIds.size > 0 && (userVolunteerIds.has(vId) || userVolunteerIds.has(aId))) return true;
        return false;
      });

  return (
    <section className="relative min-h-[60vh]">
      {/* Background logo centered and behind content */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <img src="/Logo%20JEG.jpg" alt="" className="max-w-[60%] opacity-10 dark:opacity-5 object-contain" />
      </div>

      <div className="relative z-10 space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
        <WidgetSelector initialWidgets={settings.widgets || null} initialTheme={((session?.user as any)?.settings||{}).theme} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {(!allowed || allowed.has("dashboard:programas")) && (
            <div>
              <ProgramasPendientesWidget items={programasFiltered} isAdmin={isAdmin} userName={userName} />
            </div>
          )}
          {(!allowed || allowed.has("dashboard:proyectos")) && (
            <div>
              <ProyectosWidget items={proyectos} isAdmin={isAdmin} userName={userName} />
            </div>
          )}
          {(!allowed || allowed.has("dashboard:finanzas")) && (
            <div>
              {/* Finanzas summary widget; restrict for non-admins */}
              {/* @ts-ignore */}
              <FinanzasWidget volunteerIds={Array.from(userVolunteerIds)} />
            </div>
          )}
         </div>
       </div>
     </section>
   );
 }
