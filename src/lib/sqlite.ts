import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

const dbPath = path.join(process.cwd(), "data", "app.db");
export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT DEFAULT 'VOLUNTARIO',
  email_verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS volunteers (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  congregacion TEXT,
  a2 INTEGER DEFAULT 0,
  trabajo_altura INTEGER DEFAULT 0,
  created_by TEXT,
  short_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fichas (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  prioridad TEXT DEFAULT 'MEDIA',
  estado TEXT DEFAULT 'ABIERTA',
  asignado_a TEXT,
  vencimiento TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// Add new columns for fichas if they don't exist yet
try { db.prepare("ALTER TABLE fichas ADD COLUMN instrucciones TEXT").run(); } catch {}
try { db.prepare("ALTER TABLE fichas ADD COLUMN notas TEXT").run(); } catch {}
try { db.prepare("ALTER TABLE fichas ADD COLUMN checklist TEXT").run(); } catch {}
try { db.prepare("ALTER TABLE fichas ADD COLUMN pdfId TEXT").run(); } catch {}

// Add new columns for volunteers if they don't exist yet
try { db.prepare("ALTER TABLE volunteers ADD COLUMN short_id TEXT").run(); } catch {}
try { db.prepare("ALTER TABLE volunteers ADD COLUMN email TEXT").run(); } catch {}

// Seed admin from env if not exists
try {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPwd = process.env.ADMIN_PASSWORD;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  if (adminEmail) {
    const exists = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(adminEmail) as { id: string } | undefined;
    if (!exists && (adminHash || adminPwd)) {
      const password_hash = adminHash && adminHash.length > 0
        ? adminHash
        : bcrypt.hashSync(adminPwd as string, 10);
      db.prepare(
        `INSERT INTO users (id, name, email, password_hash, role, email_verified)
         VALUES (@id, @name, @email, @password_hash, @role, 1)`
      ).run({
        id: crypto.randomUUID(),
        name: "Administrador",
        email: adminEmail,
        password_hash,
        role: "ADMIN",
      });
    }
  }
} catch (e) {
  // ignore seed errors
}
