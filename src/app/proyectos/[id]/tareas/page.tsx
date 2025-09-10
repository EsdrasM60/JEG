"use client";

import Link from "next/link";

export default function ProjectTasksPage() {
  return (
    <div className="p-6">
      Esta página ha sido movida. Usa el módulo{' '}
      <Link href="/tareas" className="text-blue-500 underline">
        /tareas
      </Link>{' '}
      para gestionar tareas.
    </div>
  );
}
