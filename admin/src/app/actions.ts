'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { admin, request, SESSION_COOKIE } from '@/lib/api'
import { findIcons, type IconHit } from '@/lib/icons'
import type { Media, Person, Portfolio, Presign, Project, Result, Section, Social, Tag } from '@/lib/types'

export type LoginState = { error: string; email: string } | null

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get('email') ?? '')
  let res: Response
  try {
    res = await request('/auth/login', { method: 'POST', body: { email, password: String(form.get('password') ?? '') } })
  } catch {
    return { error: 'No se pudo conectar con el servidor. Inténtalo de nuevo.', email }
  }
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.token) return { error: data?.error ?? 'No se pudo iniciar sesión.', email }

  ;(await cookies()).set(SESSION_COOKIE, data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  redirect('/')
}

export async function logout() {
  ;(await cookies()).delete(SESSION_COOKIE)
  redirect('/login')
}

export async function createProject() {
  const res = await admin<Project>('/projects', { method: 'POST', body: { title: 'Proyecto sin título' } })
  if (!res.ok) throw new Error(res.error)
  redirect(`/projects/${res.data.id}`)
}

export type ProjectInput = Partial<
  Pick<Project, 'title' | 'slug' | 'summary' | 'description' | 'url' | 'repoUrl' | 'status' | 'year' | 'coverMediaId'>
> & { tagIds?: string[]; sections?: Section[]; myRole?: Project['myRole']; myRoleNote?: string; people?: Person[] }

export async function updateProject(id: string, input: ProjectInput): Promise<Result<Project>> {
  const res = await admin<Project>(`/projects/${id}`, { method: 'PATCH', body: input })
  revalidatePath('/projects')
  return res
}

export async function deleteProject(id: string): Promise<Result> {
  const res = await admin(`/projects/${id}`, { method: 'DELETE' })
  if (!res.ok) return res
  revalidatePath('/projects')
  redirect('/projects')
}

export async function reorderProjects(ids: string[]): Promise<Result> {
  const res = await admin('/projects/reorder', { method: 'PATCH', body: { ids } })
  return res.ok ? { ok: true, data: undefined } : res
}

export async function presignUpload(file: { filename: string; contentType: string; size: number }) {
  return admin<Presign>('/uploads/presign', { method: 'POST', body: file })
}

export type MediaInput =
  | { type: 'IMAGE'; key: string; width?: number | null; height?: number | null }
  | { type: 'VIDEO'; key: string; posterKey?: string | null; width?: number | null; height?: number | null }
  | { type: 'EMBED'; embedUrl: string }

export async function addMedia(projectId: string, input: MediaInput) {
  return admin<Media>(`/projects/${projectId}/media`, { method: 'POST', body: input })
}

export async function updateMedia(id: string, input: { alt?: string }) {
  return admin<Media>(`/media/${id}`, { method: 'PATCH', body: input })
}

export async function deleteMedia(id: string): Promise<Result> {
  const res = await admin(`/media/${id}`, { method: 'DELETE' })
  return res.ok ? { ok: true, data: undefined } : res
}

export async function reorderMedia(projectId: string, ids: string[]): Promise<Result> {
  const res = await admin(`/projects/${projectId}/media/reorder`, { method: 'PATCH', body: { ids } })
  return res.ok ? { ok: true, data: undefined } : res
}

export type TagInput = {
  name?: string
  iconPath?: string | null
  iconKey?: string | null
  color?: string | null
  skill?: boolean
  skillGroup?: string
  skillLevel?: number
}

export async function createTag(input: TagInput & { name: string }) {
  const res = await admin<Tag>('/tags', { method: 'POST', body: input })
  revalidatePath('/tags')
  return res
}

export async function updateTag(id: string, input: TagInput) {
  const res = await admin<Tag>(`/tags/${id}`, { method: 'PATCH', body: input })
  revalidatePath('/tags')
  return res
}

export async function deleteTag(id: string): Promise<Result> {
  const res = await admin(`/tags/${id}`, { method: 'DELETE' })
  revalidatePath('/tags')
  return res.ok ? { ok: true, data: undefined } : res
}

/** Busca iconos en la librería completa; se ejecuta en el servidor para no enviarla entera al navegador. */
export async function searchIcons(query: string): Promise<IconHit[]> {
  return findIcons(String(query).slice(0, 60))
}

export type Site = {
  handle: string
  tagline: string
  link: string
  socials: Social[]
  home: 'PROJECTS' | 'PORTFOLIO'
  portfolio: Portfolio
}

export async function updateSite(input: Partial<Site>) {
  const res = await admin<Site>('/site', { method: 'PATCH', body: input })
  revalidatePath('/')
  return res
}

/** El perfil público tal como lo ve el sitio; `null` si el backend no responde. */
export async function readSite(): Promise<Site | null> {
  return request('/site')
    .then((r) => (r.ok ? (r.json() as Promise<Site>) : null))
    .catch(() => null)
}

export async function updateAccount(input: { currentPassword: string; email?: string; newPassword?: string }) {
  return admin<{ email: string }>('/account', { method: 'PATCH', body: input })
}
