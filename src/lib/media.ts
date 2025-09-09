import mongoose from "mongoose";

const MEDIA_URI = process.env.MONGODB_MEDIA_URI || "";

if (!MEDIA_URI) {
  console.warn("MONGODB_MEDIA_URI no definido. Usando MONGODB_URI para media.");
}

// Cache global para conexión de media
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GlobalWithMedia = typeof globalThis & { _mediaConn?: mongoose.Connection | null };
const g = global as GlobalWithMedia;

export async function connectMedia(): Promise<mongoose.Connection> {
  if (g._mediaConn && g._mediaConn.readyState === 1) return g._mediaConn;
  const uri = MEDIA_URI || process.env.MONGODB_URI || "";
  if (!uri) throw new Error("No hay URI de MongoDB para media");
  // Crear conexión independiente
  const conn = await mongoose.createConnection(uri, { bufferCommands: false }).asPromise();
  g._mediaConn = conn;
  return conn;
}
