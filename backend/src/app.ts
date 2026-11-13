import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { requireAdmin, verifyUpload } from './auth.ts'
import type { Db } from './db.ts'
import { adminMediaRoutes } from './routes/admin-media.ts'
import { adminProjectRoutes } from './routes/admin-projects.ts'
import { authRoutes } from './routes/auth.ts'
import { publicRoutes } from './routes/public.ts'
import type { Storage } from './storage.ts'

export type AppConfig = {
  db: Db
  storage: Storage
  jwtSecret: string
  publicApiUrl: string
  corsOrigins: string[]
  /** Base pública del bucket, si existe. Si no, los archivos salen por /media/*. */
  s3PublicUrl?: string
}

export type Deps = AppConfig & { mediaUrl: (key: string) => string }

export function createApp(config: AppConfig) {
  const publicApiUrl = config.publicApiUrl.replace(/\/$/, '')
  const base = config.s3PublicUrl ? config.s3PublicUrl.replace(/\/$/, '') : `${publicApiUrl}/media`
  const deps: Deps = { ...config, publicApiUrl, mediaUrl: (key) => `${base}/${key}` }

  const app = new Hono()
  app.use('*', cors({ origin: config.corsOrigins, allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }))
  app.onError((err, c) => {
    console.error(err)
    return c.json({ error: 'Error interno' }, 500)
  })

  app.get('/health', (c) => c.json({ ok: true }))
  app.route('/', publicRoutes(deps))
  app.route('/', authRoutes(deps))

  // Subida de respaldo: el navegador envía el archivo aquí con un token de un solo uso lógico.
  app.put('/uploads/proxy', async (c) => {
    const grant = await verifyUpload(config.jwtSecret, c.req.query('token') ?? '')
    if (!grant) return c.json({ error: 'No autorizado' }, 401)
    const length = Number(c.req.header('content-length'))
    if (!c.req.raw.body || length !== grant.size) return c.json({ error: 'El tamaño no coincide' }, 400)
    await config.storage.put(grant.key, c.req.raw.body, grant.contentType, grant.size)
    return c.json({ ok: true })
  })

  const admin = new Hono()
  admin.use('*', requireAdmin(config.jwtSecret))
  admin.route('/', adminProjectRoutes(deps))
  admin.route('/', adminMediaRoutes(deps))
  app.route('/admin', admin)

  app.notFound((c) => c.json({ error: 'No encontrado' }, 404))
  return app
}
