"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FichasPageDisabled() {
  const router = useRouter();
  useEffect(() => {
    // Redirect back to main Tareas page since this module was removed
    router.replace('/tareas');
  }, [router]);
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="text-lg font-medium">Módulo "Fichas" eliminado.</div>
        <div className="text-sm text-[color:var(--muted)] mt-2">Serás redirigido a Tareas...</div>
      </div>
    </div>
  );
}