import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { createDb } from './db.ts'
import { loadEnv } from './env.ts'
import { createS3Storage } from './storage.ts'

const env = loadEnv()
const app = createApp({
  db: createDb(env.DATABASE_URL),
  storage: createS3Storage(env),
  jwtSecret: env.JWT_SECRET,
  publicApiUrl: env.PUBLIC_API_URL,
  corsOrigins: env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
  s3PublicUrl: env.S3_PUBLIC_URL,
})

serve({ fetch: app.fetch, port: env.PORT, hostname: '0.0.0.0' }, (info) => {
  console.log(`API escuchando en el puerto ${info.port}`)
})
