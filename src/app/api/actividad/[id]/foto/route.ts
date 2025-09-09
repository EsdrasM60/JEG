import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGridFSBucket } from "@/lib/gridfs";
import { Readable } from "stream";
import sharp from "sharp";
import { connectMongo } from "@/lib/mongo";

export const runtime = "nodejs";

export async function POST(req: Request, context: any) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { params } = context as { params: { id: string } };
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Debe enviar multipart/form-data" }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Campo 'file' requerido" }, { status: 400 });

  const contentType = (file as any).type || "application/octet-stream";
  if (!contentType.startsWith("image/")) return NextResponse.json({ error: "Solo imágenes" }, { status: 415 });

  await connectMongo();
  const bucket = await getGridFSBucket("uploads");
  const bucketThumb = await getGridFSBucket("uploads_thumb");

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
  const metadata = { userEmail: session.user?.email || undefined, originalName: filename } as any;

  const optimized = await sharp(input).rotate().resize({ width: 2560, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  const thumbBuf = await sharp(input).rotate().resize({ width: 300, height: 300, fit: "cover" }).jpeg({ quality: 70 }).toBuffer();

  const uploadStream = bucket.openUploadStream(filename, { contentType: "image/jpeg", metadata });
  await new Promise<void>((resolve, reject) => {
    Readable.from(optimized).on("error", reject).pipe(uploadStream).on("error", reject).on("finish", () => resolve());
  });

  const write = bucketThumb.openUploadStream(filename, { contentType: "image/jpeg", metadata: { ...metadata, thumbOf: String(uploadStream.id) } });
  await new Promise<void>((resolve, reject) => {
    Readable.from(thumbBuf).on("error", reject).pipe(write).on("error", reject).on("finish", () => resolve());
  });

  const thumbId = String(write.id);

  // Attach foto id to actividad
  const { default: Actividad } = await import("@/models/Actividad");
  const a = await Actividad.findById(params.id);
  if (!a) return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
  a.fotos.push({ mediaId: String(uploadStream.id), url: `/api/images/${String(uploadStream.id)}`, caption: form.get("caption") as string });
  await a.save();

  return NextResponse.json({ id: String(uploadStream.id), thumbId });
}
