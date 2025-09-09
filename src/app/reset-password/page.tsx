"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token") || "";
  const email = sp.get("email") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !email) setError("Enlace inválido");
  }, [token, email]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres");
    if (password !== confirm) return setError("Las contraseñas no coinciden");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar");
      setOk(true);
      setTimeout(() => router.replace("/signin"), 1500);
    } catch (e: any) {
      setError("No se pudo restablecer la contraseña");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      <h1 className="text-2xl font-bold mb-6">Restablecer contraseña</h1>
      {ok ? (
        <p className="text-sm">Contraseña actualizada. Redirigiendo…</p>
      ) : (
        <>
          {!token || !email ? (
            <p className="text-sm mb-4">
              Enlace inválido. Solicita uno nuevo en{" "}
              <Link href="/forgot-password" className="underline">
                Recuperar contraseña
              </Link>
              .
            </p>
          ) : null}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Confirmar contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="px-4 py-2 rounded bg-foreground text-background"
              disabled={loading || !token || !email}
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
