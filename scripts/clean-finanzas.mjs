#!/usr/bin/env node
import path from 'node:path'
import url from 'node:url'
import dotenv from 'dotenv'
import mongoose from 'mongoose'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

// Load .env.local explicitly
dotenv.config({ path: path.join(root, '.env.local') })

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI no definido en .env.local')
  process.exit(1)
}

console.log('Conectando a Mongo...')
await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false })

const FinanceEntrySchema = new mongoose.Schema({
  fecha: { type: Date },
  tipo: { type: String },
  monto: { type: Number },
  categoria: { type: String },
  proyectoId: { type: String },
  subContratistaId: { type: String },
  nota: { type: String },
  createdAt: { type: Date }
})

const FinanceEntry = mongoose.models.FinanceEntry || mongoose.model('FinanceEntry', FinanceEntrySchema)

try {
  const res = await FinanceEntry.deleteMany({ tipo: { $in: ['INGRESO', 'GASTO'] } })
  console.log('Registros eliminados:', res.deletedCount)
} catch (err) {
  console.error('Error al eliminar registros:', err)
  process.exitCode = 2
} finally {
  await mongoose.disconnect()
  console.log('Desconectado')
}
