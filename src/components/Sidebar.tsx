"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

const baseLinks = [
  { href: "/dashboard", label: "🏠 Dashboard" },
  { href: "/voluntarios", label: "🤝 Empleados" },
  { href: "/tareas", label: "🛠️ Tareas" },
  { href: "/usuarios", label: "👥 Usuarios" },
  { href: "/proyectos", label: "📁 Proyectos" },
  { href: "/actividad", label: "📰 Actividad" },
  // Finanzas link will be conditionally rendered based on user role
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const session = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isAdmin = (session.data as any)?.user?.role === 'ADMIN';

  const content = (
    <>
      <div
        className={
          "fixed inset-0 bg-black/50 z-[1000] transition-opacity " +
          (open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")
        }
        onClick={onClose}
        aria-hidden
      />

      <aside
        id="app-sidebar"
        className={
          "fixed z-[1001] top-0 left-0 h-screen w-72 sm:w-80 bg-[color:var(--surface)] border-r border-[color:var(--border)] shadow-xl transform transition-transform " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
        aria-label="Sidebar"
      >
        <div className="h-full flex flex-col">
          <div className="h-14 flex items-center px-4 border-b border-[color:var(--border)] font-semibold text-white">Mantenimiento SR</div>
          <nav className="p-2 overflow-y-auto overscroll-contain flex-1">
            <ul className="space-y-1">
              {baseLinks.map((l) => {
                const active = pathname === l.href;
                return (
                  <li key={l.href}>
                    <div>
                      <Link
                        href={l.href}
                        className={
                          "flex items-center gap-2 px-3 py-2 rounded text-sm " +
                          (active
                            ? "bg-white/10 text-white"
                            : "text-[color:var(--foreground)]/90 hover:bg-white/5")
                        }
                        onClick={onClose}
                      >
                        <span>{l.label}</span>
                      </Link>

                      {/* submenu for Supervisores (/voluntarios) - Clientes y Proveedores */}
                      {l.href === '/voluntarios' && (
                        <ul className="pl-6 mt-1 space-y-1">
                          <li>
                            <Link
                              href="/voluntarios/clientes"
                              className={
                                "block px-3 py-1 rounded text-sm " +
                                (pathname === '/voluntarios/clientes' ? "bg-white/6 text-white" : "text-[color:var(--foreground)]/80 hover:bg-white/3")
                              }
                              onClick={onClose}
                            >
                              Clientes
                            </Link>
                          </li>
                          <li>
                            <Link
                              href="/voluntarios/proveedores"
                              className={
                                "block px-3 py-1 rounded text-sm " +
                                (pathname === '/voluntarios/proveedores' ? "bg-white/6 text-white" : "text-[color:var(--foreground)]/80 hover:bg-white/3")
                              }
                              onClick={onClose}
                            >
                              Proveedores
                            </Link>
                          </li>
                        </ul>
                      )}
                    </div>
                   </li>
                 );
               })}

              {/* Finanzas link only for admins */}
              {isAdmin && (
                <li>
                  <Link
                    href="/finanzas"
                    className={
                      "flex items-center gap-2 px-3 py-2 rounded text-sm " +
                      (pathname === '/finanzas'
                        ? "bg-white/10 text-white"
                        : "text-[color:var(--foreground)]/90 hover:bg-white/5")
                    }
                    onClick={onClose}
                  >
                    <span>💰 Finanzas</span>
                  </Link>
                </li>
              )}

            </ul>
          </nav>
          <div className="p-3 border-t border-[color:var(--border)] bg-[color:var(--surface)]">
            <button
              className="w-full btn btn-ghost"
              onClick={() => {
                const base = process.env.NEXT_PUBLIC_BASE_URL || undefined;
                // signOut con callback a Home
                // @ts-ignore
                signOut({ callbackUrl: base ? `${base}/` : "/" });
                onClose();
              }}
            >
              Salir
            </button>
          </div>
        </div>
      </aside>
    </>
  );

  return createPortal(content, document.body);
}
