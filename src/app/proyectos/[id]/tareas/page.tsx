export default function Page({ params }: { params: { id: string } }) {
  return (
    <div className="p-4">
      <h2 className="text-lg font-medium">Tareas</h2>
      <p className="text-sm text-[color:var(--muted)]">Sección de tareas del proyecto (placeholder).</p>
    </div>
  );
}
