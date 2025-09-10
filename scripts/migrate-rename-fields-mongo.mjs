import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mongoose from 'mongoose';
import fs from 'fs';

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('MONGODB_URI not set in .env.local');
  process.exit(1);
}

async function main() {
  console.log('Connecting to MongoDB...', MONGO_URI);
  await mongoose.connect(MONGO_URI, { bufferCommands: false });
  console.log('Connected.');

  const db = mongoose.connection.db;

  // Volunteers: copy congregacion -> empresa when empresa missing
  console.log('Updating volunteers: setting empresa from congregacion where missing...');
  const volunteers = db.collection('volunteers');
  const cursor = volunteers.find({ $and: [ { $or: [ { empresa: { $exists: false } }, { empresa: null }, { empresa: '' } ] }, { congregacion: { $exists: true, $ne: null, $ne: '' } } ] });
  let count = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    try {
      await volunteers.updateOne({ _id: doc._id }, { $set: { empresa: doc.congregacion } });
      count++;
    } catch (e) {
      console.warn('Failed updating volunteer', String(doc._id), e.message);
    }
  }
  console.log(`Volunteers updated: ${count}`);

  // Projects: set supervisorId from voluntarioId when missing
  console.log('Updating projects: setting supervisorId from voluntarioId where missing...');
  const projects = db.collection('projects');
  const projCursor = projects.find({ $and: [ { $or: [ { supervisorId: { $exists: false } }, { supervisorId: null } ] }, { voluntarioId: { $exists: true, $ne: null } } ] });
  let pcount = 0;
  while (await projCursor.hasNext()) {
    const doc = await projCursor.next();
    try {
      await projects.updateOne({ _id: doc._id }, { $set: { supervisorId: doc.voluntarioId } });
      pcount++;
    } catch (e) {
      console.warn('Failed updating project', String(doc._id), e.message);
    }
  }
  console.log(`Projects updated: ${pcount}`);

  // PlanSemanal: copy asignaciones[].congregacion -> asignaciones[].empresa
  console.log('Updating plansemanal asignaciones: adding empresa from congregacion where missing...');
  const plans = db.collection('plansemanals');
  // fetch docs that have asignaciones with congregacion and missing empresa
  const planCursor = plans.find({ 'asignaciones.congregacion': { $exists: true, $ne: null } });
  let planCount = 0;
  while (await planCursor.hasNext()) {
    const doc = await planCursor.next();
    const updatedAsign = (doc.asignaciones || []).map((a) => {
      if ((a.empresa === undefined || a.empresa === null || a.empresa === '') && a.congregacion) {
        return { ...a, empresa: a.congregacion };
      }
      return a;
    });
    try {
      await plans.updateOne({ _id: doc._id }, { $set: { asignaciones: updatedAsign } });
      planCount++;
    } catch (e) {
      console.warn('Failed updating plan', String(doc._id), e.message);
    }
  }
  console.log(`PlanSemanal docs updated: ${planCount}`);

  // Generic: update any collection documents that have congregacion field at top-level -> add empresa
  const cols = await db.listCollections().toArray();
  let genericCount = 0;
  for (const c of cols) {
    const name = c.name;
    if (['volunteers','projects','plansemanals','system.indexes'].includes(name)) continue;
    try {
      const coll = db.collection(name);
      const cur = coll.find({ $and: [ { congregacion: { $exists: true, $ne: null, $ne: '' } }, { $or: [ { empresa: { $exists: false } }, { empresa: null }, { empresa: '' } ] } ] }).limit(1000);
      while (await cur.hasNext()) {
        const d = await cur.next();
        await coll.updateOne({ _id: d._id }, { $set: { empresa: d.congregacion } });
        genericCount++;
      }
    } catch (e) {
      // ignore
    }
  }
  console.log(`Generic docs updated (top-level congregacion->empresa): ${genericCount}`);

  console.log('Done. Disconnecting.');
  await mongoose.disconnect();
}

main().catch((e) => { console.error('Migration error:', e); process.exit(1); });
