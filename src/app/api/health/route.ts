import { NextResponse } from "next/server";
import { db } from "@/lib/sqlite";
import { connectMongo, mongoReady } from "@/lib/mongo";
import { getGridFSBucket } from "@/lib/gridfs";

export async function GET() {
  let sqliteOk = false;
  try {
    // simple query
    db.prepare("SELECT 1").get();
    sqliteOk = true;
  } catch {}

  let mongo = "not-configured" as "ok" | "error" | "not-configured";
  let gridfs = "not-configured" as "ok" | "error" | "not-configured";

  if (process.env.MONGODB_URI) {
    try {
      await connectMongo();
      mongo = mongoReady() ? "ok" : "error";
      try {
        const bucket = await getGridFSBucket();
        // try a no-op list
        await bucket.find({ _id: null }).toArray().catch(() => {});
        gridfs = "ok";
      } catch {
        gridfs = "error";
      }
    } catch {
      mongo = "error";
    }
  }

  return NextResponse.json({ status: "ok", db: sqliteOk, mongo, gridfs, time: new Date().toISOString() });
}
