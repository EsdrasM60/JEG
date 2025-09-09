import { NextResponse } from "next/server";
import { getGridFSBucket, toObjectId } from "@/lib/gridfs";

export const runtime = "nodejs";

export async function GET(_req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const _id = toObjectId(params.id);
  if (!_id) return NextResponse.json({ error: "id inválido" }, { status: 400 });

  const bucket = await getGridFSBucket("fichas");
  const files = await bucket.find({ _id }).toArray();
  if (!files || files.length === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const file = files[0];
  const stream = bucket.openDownloadStream(_id);

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": file.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.filename || 'archivo')}`,
    },
  });
}
