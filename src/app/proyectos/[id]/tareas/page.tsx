export default function Page(props: any) {
  const id = props?.params?.id;
  return (
    <div className="p-4">
      <h2 className="text-lg font-medium">Tareas</h2>
      <p className="text-sm text-[color:var(--muted)]">Sección de tareas del proyecto (placeholder).</p>
    </div>
  );
}
