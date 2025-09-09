import { NextResponse } from "next/server";
import { getGridFSBucket } from "@/lib/gridfs";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "60", 10) || 60, 200);
  const bucket = await getGridFSBucket("uploads_thumb");
  const files = await bucket.find({}).sort({ uploadDate: -1 }).limit(limit).toArray();
  return NextResponse.json(files.map((f: any) => ({ id: String(f._id), filename: f.filename, contentType: f.contentType })));
}
