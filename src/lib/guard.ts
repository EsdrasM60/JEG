import { NextResponse } from "next/server";
import { role as Roles } from "./auth";

export function ensureSession(session: any) {
  if (!session) {
    throw { status: 401, message: "Unauthorized" };
  }
}

export function ensureRole(session: any, allowed: Array<string>) {
  ensureSession(session);
  const r = (session as any).user?.role ?? null;
  if (!allowed.includes(r)) {
    throw { status: 403, message: "Forbidden" };
  }
}

export function handleGuardError(e: any) {
  if (e && typeof e === "object" && "status" in e) {
    return NextResponse.json({ error: e.message || "Forbidden" }, { status: e.status });
  }
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}
