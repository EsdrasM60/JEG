import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-center">
      <img src="/Logo%20JEG.jpg" alt="JEG Soluciones" className="mx-auto h-28 mb-6" />
      <h1 className="text-3xl font-bold mb-2">JEG Soluciones</h1>
      <p className="text-[color:var(--muted)] mb-6">Inicia sesión para continuar.</p>
      <Link href="/signin" className="btn btn-primary">Ingresar</Link>
    </main>
  );
}
