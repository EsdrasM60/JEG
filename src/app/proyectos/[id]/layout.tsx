"use client";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

type Project = {
  _id: string;
  titulo: string;
  descripcion?: string;
  estado: string;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  voluntarioId?: string | null;
  ayudanteId?: string | null;
  checklist?: Array<{ text: string; done: boolean }>;
  evidencias?: Array<{ mediaId: string; thumbId?: string; titulo?: string; puntos: string[] }>;
};

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params?.id as string;

  const { data: project } = useSWR<Project>(
    projectId ? `/api/proyectos/${projectId}` : null,
    fetcher
  );

  const navigationItems = [
    { 
      href: `/proyectos/${projectId}`, 
      label: "Resumen",
      icon: "📋"
    },
    { 
      href: `/proyectos/${projectId}/evidencias`, 
      label: "Evidencias",
      icon: "📸"
    },
    { 
      href: `/proyectos/${projectId}/checklist`, 
      label: "Lista de verificación",
      icon: "✅"
    },
    { 
      href: `/proyectos/${projectId}/bitacora`, 
      label: "Bitácora",
      icon: "📝"
    },
    { 
      href: `/proyectos/${projectId}/asignaciones`, 
      label: "Asignaciones",
      icon: "👥"
    },
    { 
      href: `/proyectos/${projectId}/configuracion`, 
      label: "Configuración",
      icon: "⚙️"
    }
  ];

  function isActive(href: string) {
    if (href === `/proyectos/${projectId}`) {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  }

  function estadoBadge(estado: string) {
    const config = {
      PLANIFICADO: { label: "Sin empezar", className: "bg-blue-100 text-blue-800" },
      EN_PROGRESO: { label: "En curso", className: "bg-yellow-100 text-yellow-800" },
      EN_PAUSA: { label: "En pausa", className: "bg-orange-100 text-orange-800" },
      COMPLETADO: { label: "Completado", className: "bg-green-100 text-green-800" }
    };
    const item = config[estado as keyof typeof config] || { label: estado, className: "bg-gray-100 text-gray-800" };
    return (
      <span className={`text-xs px-2 py-1 rounded ${item.className}`}>
        {item.label}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header del proyecto */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/proyectos" 
            className="btn btn-ghost"
            title="Volver a proyectos"
          >
            ← Volver
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {project?.titulo || "Cargando..."}
            </h1>
            {project && (
              <div className="flex items-center gap-2 mt-1">
                {estadoBadge(project.estado)}
                <span className="text-sm text-[color:var(--muted)]">
                  ID: {projectId}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navegación de submódulos */}
      <nav className="border-b border-[color:var(--border)]">
        <div className="flex space-x-8 overflow-x-auto">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-2 pb-4 border-b-2 whitespace-nowrap transition-colors
                ${isActive(item.href)
                  ? "border-[color:var(--brand)] text-[color:var(--brand)]"
                  : "border-transparent text-[color:var(--muted)] hover:text-[color:var(--text)]"
                }
              `}
            >
              <span>{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Contenido del submódulo */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
