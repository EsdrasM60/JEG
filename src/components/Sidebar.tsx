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
  { href: "/voluntarios", label: "🤝 Supervisores" },
  { href: "/tareas", label: "🛠️ Tareas" },
  { href: "/plan-semanal", label: "📅 Plan semanal" },
  { href: "/usuarios", label: "👥 Usuarios" },
  { href: "/proyectos", label: "📁 Proyectos" },
  { href: "/actividad", label: "📰 Actividad" },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const session = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

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
                  </li>
                );
              })}
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
