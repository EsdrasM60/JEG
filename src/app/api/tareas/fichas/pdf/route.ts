import { NextResponse } from "next/server";
import { getGridFSBucket } from "@/lib/gridfs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Readable } from "stream";

export const runtime = "nodejs";

// Subir PDF o DOCX para una Ficha (solo autenticados)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Debe enviar multipart/form-data" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });

  const name = (file as any).name || "ficha";
  const type = (file as any).type || "application/octet-stream";
  const lower = name.toLowerCase();
  const isPdf = type === "application/pdf" || lower.endsWith(".pdf");
  const isDocx = type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || lower.endsWith(".docx");
  if (!isPdf && !isDocx) {
    return NextResponse.json({ error: "Solo se permiten archivos PDF o DOCX" }, { status: 415 });
  }
  const contentType = isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const bucket = await getGridFSBucket("fichas");

  // @ts-ignore - Node 18+ soporta Readable.fromWeb
  const nodeStream = Readable.fromWeb(file.stream());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uploadStream: any = bucket.openUploadStream(name, {
    contentType,
    metadata: {
      userEmail: session.user?.email || undefined,
      source: "upload-ficha",
      originalName: name,
    },
  });

  await new Promise<void>((resolve, reject) => {
    nodeStream
      .on("error", reject)
      .pipe(uploadStream)
      .on("error", reject)
      .on("finish", () => resolve());
  });

  return NextResponse.json({ id: String(uploadStream.id), contentType });
}
