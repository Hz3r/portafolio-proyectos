import { Hono } from 'hono'
import type { Deps } from '../app.ts'
import { projectInclude, serializeProject } from '../serialize.ts'
import { readSite } from '../site.ts'

export function publicRoutes({ db, mediaUrl, storage }: Deps) {
  const app = new Hono()

  app.get('/projects', async (c) => {
    const projects = await db.project.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: projectInclude,
    })
    return c.json(projects.map((p) => serializeProject(p, mediaUrl)))
  })

  app.get('/projects/:slug', async (c) => {
    const project = await db.project.findFirst({
      where: { slug: c.req.param('slug'), status: 'PUBLISHED' },
      include: projectInclude,
    })
    if (!project) return c.json({ error: 'No encontrado' }, 404)
    return c.json(serializeProject(project, mediaUrl))
  })

  app.get('/site', async (c) => c.json(await readSite(db, mediaUrl)))

  // El bucket es privado: redirigimos a una URL firmada de lectura.
  app.get('/media/*', async (c) => {
    const key = decodeURIComponent(c.req.path.replace(/^\/media\//, ''))
    if (!key.startsWith('projects/') || key.includes('..')) return c.json({ error: 'No encontrado' }, 404)
    const url = await storage.presignRead(key)
    c.header('Cache-Control', 'public, max-age=1800')
    return c.redirect(url, 302)
  })

  return app
}
