import { Hono } from 'hono'
import { z } from 'zod'
import type { Deps } from '../app.ts'
import { serializeTag } from '../serialize.ts'
import { invalid } from './admin-projects.ts'

const fields = {
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(30),
  // Solo comandos y números de un trazo SVG: nada de marcado.
  iconPath: z
    .string()
    .max(12000)
    .regex(/^[MmLlHhVvCcSsQqTtAaZz0-9\s,.\-eE]+$/, 'Icono inválido')
    .nullable(),
  iconKey: z
    .string()
    .regex(/^projects\/[\w.-]+$/, 'Archivo inválido')
    .nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido')
    .nullable(),
}
const createSchema = z.object(fields).partial().required({ name: true })
const updateSchema = z.object(fields).partial()

export function adminTagRoutes({ db, mediaUrl, storage }: Deps) {
  const app = new Hono()

  const taken = async (name: string, exceptId?: string) => {
    const existing = await db.tag.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
    return !!existing && existing.id !== exceptId
  }

  app.get('/tags', async (c) => {
    const tags = await db.tag.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { projects: true } } } })
    return c.json(tags.map((t) => ({ ...serializeTag(t, mediaUrl), projectCount: t._count.projects })))
  })

  app.post('/tags', async (c) => {
    const parsed = createSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json(invalid(parsed.error), 400)
    if (await taken(parsed.data.name)) return c.json({ error: 'Ya existe una etiqueta con ese nombre.' }, 409)
    const tag = await db.tag.create({ data: parsed.data })
    return c.json({ ...serializeTag(tag, mediaUrl), projectCount: 0 }, 201)
  })

  app.patch('/tags/:id', async (c) => {
    const parsed = updateSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json(invalid(parsed.error), 400)
    const existing = await db.tag.findUnique({ where: { id: c.req.param('id') }, include: { _count: { select: { projects: true } } } })
    if (!existing) return c.json({ error: 'No encontrado' }, 404)
    if (parsed.data.name && (await taken(parsed.data.name, existing.id))) {
      return c.json({ error: 'Ya existe una etiqueta con ese nombre.' }, 409)
    }
    const tag = await db.tag.update({ where: { id: existing.id }, data: parsed.data })
    // Si se reemplazó o quitó la imagen, el archivo anterior ya no se usa.
    if (existing.iconKey && tag.iconKey !== existing.iconKey) {
      await storage.remove([existing.iconKey]).catch((e) => console.error('No se pudo borrar el icono', e))
    }
    return c.json({ ...serializeTag(tag, mediaUrl), projectCount: existing._count.projects })
  })

  app.delete('/tags/:id', async (c) => {
    const tag = await db.tag.findUnique({ where: { id: c.req.param('id') } })
    if (!tag) return c.json({ error: 'No encontrado' }, 404)
    await db.tag.delete({ where: { id: tag.id } })
    if (tag.iconKey) await storage.remove([tag.iconKey]).catch((e) => console.error('No se pudo borrar el icono', e))
    return c.json({ ok: true })
  })

  return app
}
