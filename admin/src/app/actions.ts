'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { admin, request, SESSION_COOKIE } from '@/lib/api'
import type { Media, Presign, Project, Result } from '@/lib/types'

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
  Pick<Project, 'title' | 'slug' | 'summary' | 'description' | 'url' | 'status' | 'tags' | 'year' | 'coverMediaId'>
>

export async function updateProject(id: string, input: ProjectInput): Promise<Result<Project>> {
  const res = await admin<Project>(`/projects/${id}`, { method: 'PATCH', body: input })
  revalidatePath('/')
  return res
}

export async function deleteProject(id: string): Promise<Result> {
  const res = await admin(`/projects/${id}`, { method: 'DELETE' })
  if (!res.ok) return res
  revalidatePath('/')
  redirect('/')
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
