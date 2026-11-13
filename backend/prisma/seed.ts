import 'dotenv/config'
import argon2 from 'argon2'
import { createDb } from '../src/db.ts'

// Crea el usuario administrador inicial a partir de ADMIN_EMAIL y ADMIN_PASSWORD.
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
// Solo crea el administrador la primera vez: después el correo y la contraseña se cambian desde el panel.
if ((await db.adminUser.count()) > 0) {
  console.log('Ya existe un administrador; no se modifica.')
} else {
  await db.adminUser.create({ data: { email, passwordHash: await argon2.hash(password) } })
  console.log(`Administrador creado: ${email}`)
}
await db.$disconnect()
