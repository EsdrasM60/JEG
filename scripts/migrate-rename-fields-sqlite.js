#!/usr/bin/env node
const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.cwd(),'data','app.db');
const db = new Database(dbPath);
console.log('Opening SQLite DB:', dbPath);

// Volunteers table: copy congregacion -> empresa column if empresa column exists or add empresa column if not
try {
  const cols = db.prepare("PRAGMA table_info('volunteers')").all();
  const hasEmpresa = cols.some(c => c.name === 'empresa');
  if (!hasEmpresa) {
    console.log('Adding empresa column to volunteers...');
    db.prepare("ALTER TABLE volunteers ADD COLUMN empresa TEXT").run();
  }
  const res = db.prepare("UPDATE volunteers SET empresa = congregacion WHERE (empresa IS NULL OR empresa = '') AND congregacion IS NOT NULL AND congregacion != ''").run();
  console.log('Volunteers updated (sqlite):', res.changes);
} catch (e) {
  console.warn('volunteers update skipped:', e.message);
}

// Projects table: add supervisorId column if not exists and copy voluntarioId
try {
  const cols = db.prepare("PRAGMA table_info('projects')").all();
  const hasSupervisor = cols.some(c => c.name === 'supervisorId');
  if (!hasSupervisor) {
    console.log('Adding supervisorId column to projects...');
    db.prepare("ALTER TABLE projects ADD COLUMN supervisorId TEXT").run();
  }
  const res2 = db.prepare("UPDATE projects SET supervisorId = voluntarioId WHERE (supervisorId IS NULL OR supervisorId = '') AND voluntarioId IS NOT NULL AND voluntarioId != ''").run();
  console.log('Projects updated (sqlite):', res2.changes);
} catch (e) {
  console.warn('projects update skipped:', e.message);
}

console.log('Done.');
