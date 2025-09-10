import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Módulo 'Fichas' eliminado" }, { status: 404 });
}
