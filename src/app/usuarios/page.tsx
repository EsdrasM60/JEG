import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import UsersManager from "@/components/users/UsersManager";

export default async function UsuariosPage() {
  const session = await auth();
  // @ts-ignore
  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "COORDINADOR")) {
    redirect("/");
  }
  return (
    <section className="max-w-6xl mx-auto p-6">
      <UsersManager />
    </section>
  );
}
