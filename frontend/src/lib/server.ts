import type { Project } from './api'

const API_URL = (process.env.API_URL ?? import.meta.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '')

async function get<T>(path: string): Promise<{ status: number; data: T | null }> {
  try {
    const res = await fetch(`${API_URL}${path}`, { signal: AbortSignal.timeout(6000) })
    return { status: res.status, data: res.ok ? ((await res.json()) as T) : null }
  } catch (err) {
    console.error(`No se pudo consultar ${path}:`, err instanceof Error ? err.message : err)
    return { status: 0, data: null }
  }
}

/** Lista de proyectos publicados. `ok` es false si el backend no respondió. */
export async function getProjects(): Promise<{ projects: Project[]; ok: boolean }> {
  const { data } = await get<Project[]>('/projects')
  return { projects: data ?? [], ok: data !== null }
}

/** `null` = no existe; `'error'` = el backend no respondió. */
export async function getProject(slug: string): Promise<Project | null | 'error'> {
  const { status, data } = await get<Project>(`/projects/${encodeURIComponent(slug)}`)
  if (data) return data
  return status === 404 ? null : 'error'
}

export type Site = { handle: string; tagline: string; link: string }

const env = (name: string) => process.env[name] ?? import.meta.env[name] ?? ''
let cached: { at: number; site: Site } | null = null

/** Encabezado del sitio: lo editado en el panel; si está vacío, las variables de entorno. */
export async function getSite(): Promise<Site> {
  if (cached && Date.now() - cached.at < 30_000) return cached.site
  const { data } = await get<Partial<Site>>('/site')
  const site = {
    handle: data?.handle || env('SITE_HANDLE') || 'Proyectos',
    tagline: data?.tagline || env('SITE_TAGLINE'),
    link: data?.link || env('SITE_LINK'),
  }
  if (data) cached = { at: Date.now(), site }
  return site
}
