import 'dotenv/config'
import argon2 from 'argon2'
import { createDb } from '../src/db.ts'

// Crea o actualiza el único usuario administrador a partir de ADMIN_EMAIL y ADMIN_PASSWORD.
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD
if (!email || !password) {
  console.log('Seed omitido: define ADMIN_EMAIL y ADMIN_PASSWORD para crear el administrador.')
  process.exit(0)
}
if (password.length < 8) {
  console.error('ADMIN_PASSWORD debe tener al menos 8 caracteres.')
  process.exit(1)
}

const db = createDb(process.env.DATABASE_URL ?? '')
const passwordHash = await argon2.hash(password)
await db.adminUser.upsert({ where: { email }, update: { passwordHash }, create: { email, passwordHash } })
console.log(`Administrador listo: ${email}`)
await db.$disconnect()
