import { auth } from "@/lib/auth";
import Link from "next/link";

export const metadata = { title: "Perfil" };

export default async function PerfilPage() {
  const session = await auth();
  if (!session) return null;
  const user = session.user as any;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Perfil</h1>
        <Link href="/dashboard" className="btn btn-ghost">Volver</Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <form action="/api/user/profile" method="post" className="card p-4 space-y-4">
          <h2 className="font-semibold">Tus datos</h2>
          <label className="block">
            <span className="text-sm text-[color:var(--muted)]">Nombre</span>
            <input className="input w-full" name="name" defaultValue={user.name || ""} />
          </label>
          <label className="block">
            <span className="text-sm text-[color:var(--muted)]">Email</span>
            <input className="input w-full" name="email" defaultValue={user.email || ""} readOnly />
          </label>
          <button className="btn btn-primary" type="submit">Guardar</button>
        </form>

        <form action="/api/user/password" method="post" className="card p-4 space-y-4">
          <h2 className="font-semibold">Cambiar contraseña</h2>
          <label className="block">
            <span className="text-sm text-[color:var(--muted)]">Contraseña actual</span>
            <input className="input w-full" type="password" name="current" required />
          </label>
          <label className="block">
            <span className="text-sm text-[color:var(--muted)]">Nueva contraseña</span>
            <input className="input w-full" type="password" name="next" minLength={6} required />
          </label>
          <label className="block">
            <span className="text-sm text-[color:var(--muted)]">Confirmar nueva contraseña</span>
            <input className="input w-full" type="password" name="confirm" minLength={6} required />
          </label>
          <button className="btn btn-primary" type="submit">Actualizar</button>
        </form>

        <form action="/api/user/settings" method="post" className="card p-4 space-y-4 md:col-span-2">
          <h2 className="font-semibold">Preferencias</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-sm text-[color:var(--muted)]">Tema</span>
              <select className="select w-full" name="theme" defaultValue={(user as any)?.settings?.theme || "system"}>
                <option value="system">Sistema</option>
                <option value="light">Claro</option>
                <option value="dark">Oscuro</option>
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm text-[color:var(--muted)]">Widgets visibles (separa por coma)</span>
              <input className="input w-full" name="widgets" defaultValue={(user as any)?.settings?.widgets?.join(", ") || ""} placeholder="dashboard:programas, dashboard:proyectos" />
            </label>
          </div>
          <button className="btn btn-primary" type="submit">Guardar preferencias</button>
        </form>
      </div>
    </section>
  );
}
