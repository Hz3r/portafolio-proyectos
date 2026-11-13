import { Hono } from 'hono'
import { z } from 'zod'
import type { Deps } from '../app.ts'
import { serializeProject } from '../serialize.ts'
import { uniqueSlug } from '../slug.ts'

const link = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === '' || /^https?:\/\/\S+\.\S+/.test(v), 'El enlace debe empezar con http:// o https://')
  .transform((v) => v || null)

const fields = {
  title: z.string().trim().min(1, 'El título es obligatorio').max(140),
  slug: z.string().trim().max(80).optional(),
  summary: z.string().trim().max(200),
  description: z.string().max(20000),
  url: link.nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  tags: z
    .array(z.string().trim().min(1).max(30))
    .max(12)
    .transform((tags) => [...new Set(tags)]),
  year: z.number().int().min(1970).max(2100).nullable(),
  coverMediaId: z.string().nullable(),
}
const createSchema = z.object({ ...fields }).partial().required({ title: true })
const updateSchema = z.object({ ...fields }).partial()
const reorderSchema = z.object({ ids: z.array(z.string()).min(1) })

export const invalid = (error: z.ZodError) => ({ error: error.issues[0]?.message ?? 'Datos inválidos' })

export function adminProjectRoutes({ db, mediaUrl, storage }: Deps) {
  const app = new Hono()

  app.get('/projects', async (c) => {
    const projects = await db.project.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: { media: true },
    })
    return c.json(projects.map((p) => serializeProject(p, mediaUrl)))
  })

  app.post('/projects', async (c) => {
    const parsed = createSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json(invalid(parsed.error), 400)
    const { slug, coverMediaId: _ignored, ...data } = parsed.data
    // Los proyectos nuevos entran arriba de la lista.
    const first = await db.project.aggregate({ _min: { order: true } })
    const project = await db.project.create({
      data: { ...data, slug: await uniqueSlug(db, slug || data.title), order: (first._min.order ?? 1) - 1 },
      include: { media: true },
    })
    return c.json(serializeProject(project, mediaUrl), 201)
  })

  app.patch('/projects/reorder', async (c) => {
    const parsed = reorderSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json(invalid(parsed.error), 400)
    await db.$transaction(
      parsed.data.ids.map((id, order) => db.project.updateMany({ where: { id }, data: { order } })),
    )
    return c.json({ ok: true })
  })

  app.get('/projects/:id', async (c) => {
    const project = await db.project.findUnique({ where: { id: c.req.param('id') }, include: { media: true } })
    if (!project) return c.json({ error: 'No encontrado' }, 404)
    return c.json(serializeProject(project, mediaUrl))
  })

  app.patch('/projects/:id', async (c) => {
    const id = c.req.param('id')
    const parsed = updateSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json(invalid(parsed.error), 400)
    const existing = await db.project.findUnique({ where: { id } })
    if (!existing) return c.json({ error: 'No encontrado' }, 404)

    const { slug, coverMediaId, ...data } = parsed.data
    if (coverMediaId) {
      const media = await db.media.findFirst({ where: { id: coverMediaId, projectId: id } })
      if (!media) return c.json({ error: 'La portada no pertenece a este proyecto' }, 400)
    }
    const project = await db.project.update({
      where: { id },
      data: {
        ...data,
        ...(coverMediaId !== undefined ? { coverMediaId } : {}),
        ...(slug !== undefined && slug !== existing.slug
          ? { slug: await uniqueSlug(db, slug || data.title || existing.title, id) }
          : {}),
      },
      include: { media: true },
    })
    return c.json(serializeProject(project, mediaUrl))
  })

  app.delete('/projects/:id', async (c) => {
    const project = await db.project.findUnique({ where: { id: c.req.param('id') }, include: { media: true } })
    if (!project) return c.json({ error: 'No encontrado' }, 404)
    await db.project.delete({ where: { id: project.id } })
    const keys = project.media.flatMap((m) => [m.key, m.posterKey]).filter((k): k is string => !!k)
    if (keys.length) await storage.remove(keys).catch((e) => console.error('No se pudieron borrar archivos', e))
    return c.json({ ok: true })
  })

  return app
}
