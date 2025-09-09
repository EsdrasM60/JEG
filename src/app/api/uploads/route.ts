import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGridFSBucket } from "@/lib/gridfs";
import { Readable } from "stream";
import sharp from "sharp";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Debe enviar un formulario multipart/form-data" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Campo 'file' requerido" }, { status: 400 });
  }

  const contentType = (file as any).type || "application/octet-stream";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 415 });
  }

  const bucket = await getGridFSBucket("uploads");
  const bucketThumb = await getGridFSBucket("uploads_thumb");

  // Leer todo el archivo en buffer para procesar con sharp
  const web = file.stream();
  // @ts-ignore
  const nodeStream = Readable.fromWeb(web);
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    nodeStream.on("data", (c: Buffer) => chunks.push(c));
    nodeStream.on("end", () => resolve());
    nodeStream.on("error", reject);
  });
  const input = Buffer.concat(chunks);

  const filename = (file as any).name || "upload";
  const metadata = {
    userEmail: session.user?.email || undefined,
    userName: session.user?.name || undefined,
    originalName: filename,
  } as Record<string, any>;

  // Optimizar original (limitar a 2560px, comprimir)
  const optimized = await sharp(input).rotate().resize({ width: 2560, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();

  // Miniatura 300px
  const thumbBuf = await sharp(input).rotate().resize({ width: 300, height: 300, fit: "cover" }).jpeg({ quality: 70, mozjpeg: true }).toBuffer();

  // Guardar original
  const uploadStream = bucket.openUploadStream(filename, { contentType: "image/jpeg", metadata });
  await new Promise<void>((resolve, reject) => {
    Readable.from(optimized).on("error", reject).pipe(uploadStream).on("error", reject).on("finish", () => resolve());
  });

  // Guardar miniatura
  const write = bucketThumb.openUploadStream(filename, { contentType: "image/jpeg", metadata: { ...metadata, thumbOf: String(uploadStream.id) } });
  await new Promise<void>((resolve, reject) => {
    Readable.from(thumbBuf).on("error", reject).pipe(write).on("error", reject).on("finish", () => resolve());
  });

  // @ts-ignore
  const thumbId = String(write.id);

  return NextResponse.json({ id: String(uploadStream.id), thumbId, filename: uploadStream.filename, contentType: "image/jpeg" });
}
