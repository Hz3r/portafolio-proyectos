import 'dotenv/config'
import argon2 from 'argon2'
import { createDb } from '../src/db.ts'

// Crea o actualiza el usuario administrador a partir de ADMIN_EMAIL y ADMIN_PASSWORD.
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
// Sincroniza el administrador con ADMIN_EMAIL y ADMIN_PASSWORD en cada release:
// si no hay ninguno lo crea; si ya existe, actualiza correo y contraseña cuando difieren.
const existing = await db.adminUser.findFirst({ orderBy: { createdAt: 'asc' } })
if (!existing) {
  await db.adminUser.create({ data: { email, passwordHash: await argon2.hash(password) } })
  console.log(`Administrador creado: ${email}`)
} else {
  const sameEmail = existing.email === email
  const samePassword = await argon2.verify(existing.passwordHash, password)
  if (sameEmail && samePassword) {
    console.log('Administrador al día con las variables de entorno.')
  } else {
    await db.adminUser.update({
      where: { id: existing.id },
      data: { email, passwordHash: samePassword ? existing.passwordHash : await argon2.hash(password) },
    })
    console.log(`Administrador actualizado: ${email}`)
  }
}
await db.$disconnect()
