import { randomUUID } from 'node:crypto'
import { Hono } from 'hono'
import { z } from 'zod'
import type { Deps } from '../app.ts'
import { signUpload } from '../auth.ts'
import { toEmbedUrl } from '../embed.ts'
import { serializeMedia } from '../serialize.ts'
import { invalid } from './admin-projects.ts'

const MB = 1024 * 1024
export const UPLOAD_RULES: Record<string, { ext: string; kind: 'IMAGE' | 'VIDEO'; max: number }> = {
  'image/jpeg': { ext: 'jpg', kind: 'IMAGE', max: 15 * MB },
  'image/png': { ext: 'png', kind: 'IMAGE', max: 15 * MB },
  'image/webp': { ext: 'webp', kind: 'IMAGE', max: 15 * MB },
  'image/avif': { ext: 'avif', kind: 'IMAGE', max: 15 * MB },
  'image/gif': { ext: 'gif', kind: 'IMAGE', max: 15 * MB },
  'video/mp4': { ext: 'mp4', kind: 'VIDEO', max: 500 * MB },
  'video/webm': { ext: 'webm', kind: 'VIDEO', max: 500 * MB },
}

const presignSchema = z.object({
  filename: z.string().max(300).default('archivo'),
  contentType: z.string(),
  size: z.number().int().positive(),
})
const key = z.string().regex(/^projects\/[\w.-]+$/, 'Archivo inválido')
const dimension = z.number().int().positive().max(20000).nullable().optional()
const createSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('IMAGE'), key, alt: z.string().max(300).default(''), width: dimension, height: dimension }),
  z.object({
    type: z.literal('VIDEO'),
    key,
    posterKey: key.nullable().optional(),
    alt: z.string().max(300).default(''),
    width: dimension,
    height: dimension,
  }),
  z.object({ type: z.literal('EMBED'), embedUrl: z.string().max(500), alt: z.string().max(300).default('') }),
])
const updateSchema = z.object({ alt: z.string().max(300).optional(), posterKey: key.nullable().optional() })
const reorderSchema = z.object({ ids: z.array(z.string()).min(1) })

export function adminMediaRoutes({ db, mediaUrl, storage, jwtSecret, publicApiUrl }: Deps) {
  const app = new Hono()

  app.post('/uploads/presign', async (c) => {
    const parsed = presignSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json(invalid(parsed.error), 400)
    const { contentType, size, filename } = parsed.data
    const rule = UPLOAD_RULES[contentType]
    if (!rule) return c.json({ error: 'Formato no permitido. Usa jpg, png, webp, avif, gif, mp4 o webm.' }, 400)
    if (size > rule.max) {
      return c.json({ error: `El archivo supera el límite de ${rule.max / MB} MB.` }, 400)
    }
    const base = filename.replace(/\.[^.]*$/, '').normalize('NFKD').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
    const objectKey = `projects/${randomUUID()}${base ? `-${base}` : ''}.${rule.ext}`
    const token = await signUpload(jwtSecret, { key: objectKey, contentType, size })
    return c.json({
      key: objectKey,
      kind: rule.kind,
      uploadUrl: await storage.presignUpload(objectKey, contentType, size),
      // Respaldo si el bucket rechaza la subida directa desde el navegador (CORS).
      fallbackUrl: `${publicApiUrl}/uploads/proxy?token=${encodeURIComponent(token)}`,
    })
  })

  app.post('/projects/:id/media', async (c) => {
    const projectId = c.req.param('id')
    const parsed = createSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json(invalid(parsed.error), 400)
    const project = await db.project.findUnique({ where: { id: projectId }, select: { id: true } })
    if (!project) return c.json({ error: 'No encontrado' }, 404)

    const input = parsed.data
    let data
    if (input.type === 'EMBED') {
      const embedUrl = toEmbedUrl(input.embedUrl)
      if (!embedUrl) return c.json({ error: 'Pega un enlace de YouTube o Vimeo.' }, 400)
      data = { type: input.type, embedUrl, alt: input.alt }
    } else {
      data = { ...input }
    }
    const last = await db.media.aggregate({ where: { projectId }, _max: { order: true } })
    const media = await db.media.create({ data: { ...data, projectId, order: (last._max.order ?? -1) + 1 } })
    return c.json(serializeMedia(media, mediaUrl), 201)
  })

  app.patch('/projects/:id/media/reorder', async (c) => {
    const projectId = c.req.param('id')
    const parsed = reorderSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json(invalid(parsed.error), 400)
    await db.$transaction(
      parsed.data.ids.map((id, order) => db.media.updateMany({ where: { id, projectId }, data: { order } })),
    )
    return c.json({ ok: true })
  })

  app.patch('/media/:id', async (c) => {
    const parsed = updateSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json(invalid(parsed.error), 400)
    const existing = await db.media.findUnique({ where: { id: c.req.param('id') } })
    if (!existing) return c.json({ error: 'No encontrado' }, 404)
    const media = await db.media.update({ where: { id: existing.id }, data: parsed.data })
    return c.json(serializeMedia(media, mediaUrl))
  })

  app.delete('/media/:id', async (c) => {
    const media = await db.media.findUnique({ where: { id: c.req.param('id') } })
    if (!media) return c.json({ error: 'No encontrado' }, 404)
    await db.media.delete({ where: { id: media.id } })
    const keys = [media.key, media.posterKey].filter((k): k is string => !!k)
    if (keys.length) await storage.remove(keys).catch((e) => console.error('No se pudo borrar el archivo', e))
    return c.json({ ok: true })
  })

  return app
}
