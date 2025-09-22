export default function Page(props: any) {
  const params = props?.params || {};
  const projectId = params.id || params.projectId || "";
  const adicionalId = params.aid || params.adicionalId || "";

  return (
    <div>
      <h1>Adicional</h1>
      <p>Proyecto: {String(projectId)}</p>
      <p>Adicional: {String(adicionalId)}</p>
    </div>
  );
}
