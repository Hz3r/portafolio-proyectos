import argon2 from 'argon2'
import { Hono } from 'hono'
import { z } from 'zod'
import type { Deps } from '../app.ts'
import { createRateLimiter, signSession } from '../auth.ts'

const body = z.object({ email: z.string().min(1), password: z.string().min(1) })

export function authRoutes({ db, jwtSecret }: Deps) {
  const app = new Hono()
  const limiter = createRateLimiter(10, 15 * 60 * 1000)

  app.post('/auth/login', async (c) => {
    const ip = (c.req.header('x-forwarded-for') ?? 'local').split(',')[0].trim()
    if (limiter.blocked(ip)) return c.json({ error: 'Demasiados intentos. Espera unos minutos.' }, 429)

    const parsed = body.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json({ error: 'Datos inválidos' }, 400)

    const user = await db.adminUser.findUnique({ where: { email: parsed.data.email.trim().toLowerCase() } })
    const ok = !!user && (await argon2.verify(user.passwordHash, parsed.data.password).catch(() => false))
    if (!user || !ok) {
      limiter.fail(ip)
      return c.json({ error: 'Correo o contraseña incorrectos' }, 401)
    }
    limiter.clear(ip)
    return c.json({ token: await signSession(jwtSecret, user.id) })
  })

  return app
}
