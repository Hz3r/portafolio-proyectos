import argon2 from 'argon2'
import { Hono } from 'hono'
import { z } from 'zod'
import type { Deps } from '../app.ts'
import { portfolioKeys, portfolioSchema, readPortfolio } from '../portfolio.ts'
import { HOME_PAGES, readSite, readSocials, socialKeys, socialsSchema } from '../site.ts'
import { invalid } from './admin-projects.ts'

const siteSchema = z
  .object({
    handle: z.string().trim().max(40),
    tagline: z.string().trim().max(160),
    link: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === '' || /^https?:\/\/\S+\.\S+/.test(v), 'El enlace debe empezar con http:// o https://'),
    socials: socialsSchema,
    home: z.enum(HOME_PAGES),
    portfolio: portfolioSchema,
  })
  .partial()

const accountSchema = z.object({
  currentPassword: z.string().min(1, 'Escribe tu contraseña actual'),
  email: z.string().trim().toLowerCase().email('Correo inválido').max(200).optional(),
  newPassword: z.string().min(8, 'La contraseña nueva debe tener al menos 8 caracteres').max(200).optional(),
})

export function adminSettingsRoutes({ db, mediaUrl, storage }: Deps) {
  const app = new Hono<{ Variables: { userId: string } }>()

  app.patch('/site', async (c) => {
    const parsed = siteSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json(invalid(parsed.error), 400)
    const before = await db.siteSettings.findUnique({ where: { id: 1 } })
    await db.siteSettings.upsert({ where: { id: 1 }, update: parsed.data, create: { id: 1, ...parsed.data } })
    // Fotos, currículum, imágenes de la galería e iconos de redes que ya no se usan.
    const { portfolio, socials } = parsed.data
    const kept = new Set([...(portfolio ? portfolioKeys(portfolio) : []), ...(socials ? socialKeys(socials) : [])])
    const stale = [
      ...(portfolio ? portfolioKeys(readPortfolio(before?.portfolio)) : []),
      ...(socials ? socialKeys(readSocials(before?.socials)) : []),
    ].filter((k) => !kept.has(k))
    if (stale.length) await storage.remove(stale).catch((e) => console.error('No se pudo borrar el archivo', e))
    return c.json(await readSite(db, mediaUrl))
  })

  app.get('/account', async (c) => {
    const user = await db.adminUser.findUnique({ where: { id: c.get('userId') } })
    if (!user) return c.json({ error: 'No autorizado' }, 401)
    return c.json({ email: user.email })
  })

  // Cambiar correo o contraseña exige la contraseña actual.
  app.patch('/account', async (c) => {
    const parsed = accountSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json(invalid(parsed.error), 400)
    const user = await db.adminUser.findUnique({ where: { id: c.get('userId') } })
    if (!user) return c.json({ error: 'No autorizado' }, 401)
    const ok = await argon2.verify(user.passwordHash, parsed.data.currentPassword).catch(() => false)
    if (!ok) return c.json({ error: 'La contraseña actual no es correcta.' }, 403)

    const { email, newPassword } = parsed.data
    if (email && email !== user.email && (await db.adminUser.findUnique({ where: { email } }))) {
      return c.json({ error: 'Ese correo ya está en uso.' }, 409)
    }
    const updated = await db.adminUser.update({
      where: { id: user.id },
      data: { ...(email ? { email } : {}), ...(newPassword ? { passwordHash: await argon2.hash(newPassword) } : {}) },
    })
    return c.json({ email: updated.email })
  })

  return app
}
