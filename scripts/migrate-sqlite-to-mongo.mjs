#!/usr/bin/env node
import path from 'path';
import Database from 'better-sqlite3';
import mongoose, { Schema } from 'mongoose';

const SQLITE_PATH = path.join(process.cwd(), 'data', 'app.db');
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('ERROR: Define MONGODB_URI in your environment before running this script.');
  process.exit(1);
}

function toBool(v) { return v === 1 || v === true || v === '1'; }
function toDate(v) { try { return v ? new Date(v) : null; } catch { return null; } }
function parseChecklist(v) {
  if (!v) return [];
  try {
    const arr = typeof v === 'string' ? JSON.parse(v) : v;
    if (Array.isArray(arr)) {
      return arr.map(i => ({ text: String(i.text ?? i), done: !!i.done })).filter(i => i.text);
    }
    return [];
  } catch {
    return [];
  }
}

// Define minimal schemas inline to avoid TS path aliases
const UserSchema = new Schema({
  name: String,
  email: { type: String, unique: true, index: true, required: true },
  passwordHash: String,
  role: { type: String, enum: ['ADMIN', 'COORDINADOR', 'VOLUNTARIO'], default: 'VOLUNTARIO' },
  emailVerified: { type: Boolean, default: false },
}, { timestamps: true });

const VolunteerSchema = new Schema({
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  email: { type: String, index: true, unique: true, sparse: true },
  telefono: String,
  congregacion: String,
  a2: { type: Boolean, default: false },
  trabajo_altura: { type: Boolean, default: false },
  created_by: String,
  shortId: { type: String, index: true, unique: true, sparse: true },
}, { timestamps: true });

const ChecklistItem = new Schema({ text: { type: String, required: true }, done: { type: Boolean, default: false } }, { _id: false });
const FichaSchema = new Schema({
  titulo: { type: String, required: true },
  descripcion: String,
  prioridad: { type: String, enum: ['BAJA', 'MEDIA', 'ALTA'], default: 'MEDIA' },
  estado: { type: String, enum: ['ABIERTA', 'EN_PROGRESO', 'COMPLETADA'], default: 'ABIERTA' },
  asignado_a: String,
  vencimiento: Date,
  instrucciones: String,
  notas: String,
  checklist: { type: [ChecklistItem], default: [] },
  pdfId: { type: Schema.Types.ObjectId, required: false },
}, { timestamps: true });

const User = mongoose.models._MigrUser || mongoose.model('_MigrUser', UserSchema);
const Volunteer = mongoose.models._MigrVolunteer || mongoose.model('_MigrVolunteer', VolunteerSchema);
const Ficha = mongoose.models._MigrFicha || mongoose.model('_MigrFicha', FichaSchema);

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, { bufferCommands: false });
  console.log('Connected. Opening SQLite:', SQLITE_PATH);
  const db = new Database(SQLITE_PATH);

  let usersUpserted = 0;
  try {
    const rows = db.prepare('SELECT id, name, email, password_hash, role, email_verified, created_at FROM users').all();
    for (const r of rows) {
      const filter = { email: r.email };
      const setOnInsert = { name: r.name || null, passwordHash: r.password_hash || null, createdAt: toDate(r.created_at) || undefined };
      const set = { role: r.role || 'VOLUNTARIO', emailVerified: toBool(r.email_verified) };
      await User.updateOne(filter, { $setOnInsert: setOnInsert, $set: set }, { upsert: true });
      usersUpserted++;
    }
    console.log(`Users migrated: ${usersUpserted}`);
  } catch (e) {
    console.warn('Users migration skipped or failed:', e.message);
  }

  let volunteersUpserted = 0;
  try {
    const rows = db.prepare('SELECT id, nombre, apellido, email, telefono, congregacion, a2, trabajo_altura, created_by, short_id, created_at FROM volunteers').all();
    for (const r of rows) {
      const key = r.email ? { email: r.email } : { nombre: r.nombre, apellido: r.apellido };
      const setOnInsert = { createdAt: toDate(r.created_at) || undefined };
      const set = {
        nombre: r.nombre,
        apellido: r.apellido,
        email: r.email || undefined,
        telefono: r.telefono || undefined,
        congregacion: r.congregacion || undefined,
        a2: toBool(r.a2),
        trabajo_altura: toBool(r.trabajo_altura),
        created_by: r.created_by || undefined,
        shortId: r.short_id || undefined,
      };
      await Volunteer.updateOne(key, { $setOnInsert: setOnInsert, $set: set }, { upsert: true });
      volunteersUpserted++;
    }
    console.log(`Volunteers migrated: ${volunteersUpserted}`);
  } catch (e) {
    console.warn('Volunteers migration skipped or failed:', e.message);
  }

  let fichasUpserted = 0;
  try {
    const rows = db.prepare('SELECT id, titulo, descripcion, prioridad, estado, asignado_a, vencimiento, instrucciones, notas, checklist, created_at, pdfId FROM fichas').all();
    for (const r of rows) {
      const setOnInsert = { createdAt: toDate(r.created_at) || undefined };
      const set = {
        titulo: r.titulo,
        descripcion: r.descripcion || undefined,
        prioridad: r.prioridad || 'MEDIA',
        estado: r.estado || 'ABIERTA',
        asignado_a: r.asignado_a || undefined,
        vencimiento: toDate(r.vencimiento) || undefined,
        instrucciones: r.instrucciones || undefined,
        notas: r.notas || undefined,
        checklist: parseChecklist(r.checklist),
      };
      // Try to keep idempotency by titulo+createdAt
      const filter = { titulo: r.titulo, createdAt: toDate(r.created_at) || undefined };
      await Ficha.updateOne(filter, { $setOnInsert: setOnInsert, $set: set }, { upsert: true });
      fichasUpserted++;
    }
    console.log(`Fichas migrated: ${fichasUpserted}`);
  } catch (e) {
    console.warn('Fichas migration skipped or failed:', e.message);
  }

  await mongoose.disconnect();
  db.close?.();
  console.log('Done.');
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
