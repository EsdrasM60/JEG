import 'dotenv/config';
import mongoose from 'mongoose';
import Database from 'better-sqlite3';
import path from 'path';

async function migrateMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('Skipping MongoDB migration: MONGODB_URI not set');
    return;
  }
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || undefined });
  const db = mongoose.connection.db;
  const coll = db.collection('volunteers');

  const filterCargoMissing = { $or: [{ cargo: { $exists: false } }, { cargo: null }, { cargo: '' }] };

  console.log('Setting cargo = Supervisor for documents with a2 = true and cargo missing...');
  const res1 = await coll.updateMany(
    { ...filterCargoMissing, a2: true },
    { $set: { cargo: 'Supervisor' }, $unset: { a2: '', trabajo_altura: '' } }
  );
  console.log('Modified (Supervisor):', res1.modifiedCount || res1.result?.nModified || res1.matchedCount);

  console.log('Setting cargo = Tecnico for remaining documents with cargo missing...');
  const res2 = await coll.updateMany(
    { ...filterCargoMissing, $or: [{ a2: false }, { a2: { $exists: false } }] },
    { $set: { cargo: 'Tecnico' }, $unset: { a2: '', trabajo_altura: '' } }
  );
  console.log('Modified (Tecnico):', res2.modifiedCount || res2.result?.nModified || res2.matchedCount);

  console.log('MongoDB migration completed. Disconnecting...');
  await mongoose.disconnect();
}

function migrateSqlite() {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'app.db');
    console.log('Opening SQLite DB at', dbPath);
    const db = new Database(dbPath);

    console.log("Updating volunteers.cargo from a2 where empty...");
    const info = db.prepare(
      "UPDATE volunteers SET cargo = CASE WHEN a2 = 1 THEN 'Supervisor' ELSE 'Tecnico' END WHERE cargo IS NULL OR cargo = ''"
    ).run();
    console.log('SQLite rows changed:', info.changes);

    // We intentionally keep a2 and trabajo_altura columns for now for compatibility.
    db.close();
  } catch (e) {
    console.error('SQLite migration failed:', e);
  }
}

async function main() {
  try {
    await migrateMongo();
    migrateSqlite();
    console.log('Migration finished. Please restart the dev server to pick up model changes.');
  } catch (e) {
    console.error('Migration error:', e);
    process.exit(1);
  }
}

main();
