import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Módulo 'Fichas' eliminado" }, { status: 404 });
}
