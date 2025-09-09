#!/usr/bin/env node
import path from 'node:path'
import url from 'node:url'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..')

// Load .env.local explicitly
dotenv.config({ path: path.join(root, '.env.local') })

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI no definido')
  process.exit(1)
}

const email = process.env.ADMIN_EMAIL
const pwd = process.env.ADMIN_PASSWORD
const hash = process.env.ADMIN_PASSWORD_HASH

if (!email || (!pwd && !hash)) {
  console.error('ADMIN_EMAIL y ADMIN_PASSWORD/ADMIN_PASSWORD_HASH requeridos')
  process.exit(1)
}

const passwordHash = hash && hash.length > 0 ? hash : bcrypt.hashSync(pwd, 10)

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  role: String,
  emailVerified: Boolean,
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', UserSchema)

await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false })

const exists = await User.findOne({ email }).lean()
if (exists) {
  await User.updateOne({ email }, { $set: { passwordHash, role: 'ADMIN', emailVerified: true, name: 'Administrador' } })
  console.log('Admin actualizado:', email)
} else {
  await User.create({ name: 'Administrador', email, passwordHash, role: 'ADMIN', emailVerified: true })
  console.log('Admin creado:', email)
}

await mongoose.disconnect()
