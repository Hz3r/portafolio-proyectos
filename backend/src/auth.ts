import type { MiddlewareHandler } from 'hono'
import { sign, verify } from 'hono/jwt'

const WEEK = 60 * 60 * 24 * 7
const now = () => Math.floor(Date.now() / 1000)

export function signSession(secret: string, userId: string): Promise<string> {
  return sign({ sub: userId, kind: 'session', exp: now() + WEEK }, secret, 'HS256')
}

export type UploadGrant = { key: string; contentType: string; size: number }

export function signUpload(secret: string, grant: UploadGrant): Promise<string> {
  return sign({ ...grant, kind: 'upload', exp: now() + 60 * 60 }, secret, 'HS256')
}

export async function verifyUpload(secret: string, token: string): Promise<UploadGrant | null> {
  try {
    const p = await verify(token, secret, 'HS256')
    if (p.kind !== 'upload') return null
    return { key: String(p.key), contentType: String(p.contentType), size: Number(p.size) }
  } catch {
    return null
  }
}

export function requireAdmin(secret: string): MiddlewareHandler {
  return async (c, next) => {
    const header = c.req.header('authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    try {
      const payload = await verify(token, secret, 'HS256')
      if (payload.kind !== 'session') throw new Error('wrong kind')
      c.set('userId', String(payload.sub))
    } catch {
      return c.json({ error: 'No autorizado' }, 401)
    }
    await next()
  }
}

/** Límite simple en memoria: `max` intentos por clave cada `windowMs`. */
export function createRateLimiter(max: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>()
  return {
    blocked(key: string): boolean {
      const entry = hits.get(key)
      return !!entry && entry.resetAt > Date.now() && entry.count >= max
    },
    fail(key: string) {
      const entry = hits.get(key)
      if (!entry || entry.resetAt <= Date.now()) hits.set(key, { count: 1, resetAt: Date.now() + windowMs })
      else entry.count++
    },
    clear(key: string) {
      hits.delete(key)
    },
  }
}
