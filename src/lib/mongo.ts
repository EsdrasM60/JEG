import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI) {
  console.warn("MONGODB_URI no definido. Configura .env.local");
}

type GlobalWithMongoose = typeof globalThis & {
  _mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};

const g = global as GlobalWithMongoose;

export async function connectMongo() {
  if (!g._mongoose) g._mongoose = { conn: null, promise: null };
  if (g._mongoose.conn) return g._mongoose.conn;
  if (!g._mongoose.promise) {
    g._mongoose.promise = mongoose
      .connect(MONGODB_URI, {
        // options
        bufferCommands: false,
      })
      .then(async (m) => {
        await seedAdmin();
        return m;
      });
  }
  g._mongoose.conn = await g._mongoose.promise;

  // Ensure all models are registered (avoid MissingSchemaError due to load order / HMR)
  try {
    await import("@/lib/models");
  } catch (e) {
    // ignore
  }

  return g._mongoose.conn;
}

async function seedAdmin() {
  try {
    const { default: User } = await import("@/models/User");
    const email = process.env.ADMIN_EMAIL;
    const pwd = process.env.ADMIN_PASSWORD;
    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!email || (!pwd && !hash)) return;
    const exists = await User.findOne({ email }).lean();
    if (exists) return;
    const passwordHash = hash && hash.length > 0 ? hash : bcrypt.hashSync(pwd as string, 10);
    await User.create({ name: "Administrador", email, passwordHash, role: "ADMIN", emailVerified: true });
    console.log("Seeded ADMIN user in MongoDB");
  } catch (e) {
    console.warn("Admin seed skipped:", (e as Error).message);
  }
}

export function mongoReady() {
  return mongoose.connection.readyState === 1;
}
