import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Result } from './types'

export const SESSION_COOKIE = 'session'
const API_URL = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '')

export async function request(path: string, init: { method?: string; body?: unknown; token?: string } = {}) {
  return fetch(`${API_URL}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  })
}

/** Llama a una ruta /admin del backend con la sesión actual. Sin sesión válida, manda a /login. */
export async function admin<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<Result<T>> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) redirect('/login')

  let res: Response
  try {
    res = await request(`/admin${path}`, { ...init, token })
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servidor. Inténtalo de nuevo.' }
  }
  if (res.status === 401) redirect('/login?expirada=1')

  const data = await res.json().catch(() => null)
  if (!res.ok) return { ok: false, error: data?.error ?? `Error ${res.status}` }
  return { ok: true, data: data as T }
}
