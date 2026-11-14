import { Hono } from 'hono'
import { z } from 'zod'
import type { Deps } from '../app.ts'
import { portfolioContext } from '../ask.ts'
import { createRateLimiter } from '../auth.ts'
import { githubUser } from '../github.ts'
import { projectInclude, serializeProject } from '../serialize.ts'
import { readSite } from '../site.ts'

const question = z.object({ question: z.string().trim().min(2).max(300) })

export function publicRoutes({ db, mediaUrl, storage, ask, github }: Deps) {
  const app = new Hono()
  // El asistente cuesta dinero por pregunta: tope por visitante y tope total por día.
  const perVisitor = createRateLimiter(12, 10 * 60 * 1000)
  const perDay = createRateLimiter(400, 24 * 60 * 60 * 1000)

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

  app.get('/site', async (c) => c.json({ ...(await readSite(db, mediaUrl)), ai: !!ask }))

  // Calendario de contribuciones del GitHub puesto en las redes del sitio.
  app.get('/github', async (c) => {
    const site = await readSite(db, mediaUrl)
    const url = site.socials.find((s) => s.kind === 'github')?.url
    const user = githubUser(url)
    const data = user && github ? await github(user) : null
    if (!user || !data) return c.json({ error: 'No encontrado' }, 404)
    c.header('Cache-Control', 'public, max-age=1800')
    return c.json({ user, url, ...data })
  })

  // Pregunta libre desde la terminal del portafolio.
  app.post('/ask', async (c) => {
    if (!ask) return c.json({ error: 'El asistente no está activado.' }, 503)
    const parsed = question.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json({ error: 'Escribe una pregunta de hasta 300 caracteres.' }, 400)
    const ip = (c.req.header('x-forwarded-for') ?? 'local').split(',')[0].trim()
    if (perVisitor.blocked(ip) || perDay.blocked('todos')) return c.json({ error: 'Demasiadas preguntas por ahora. Prueba más tarde.' }, 429)
    perVisitor.fail(ip)
    perDay.fail('todos')

    const [site, projects] = await Promise.all([
      readSite(db, mediaUrl),
      db.project.findMany({ where: { status: 'PUBLISHED' }, orderBy: [{ order: 'asc' }, { createdAt: 'desc' }], include: { tags: { include: { tag: true }, orderBy: { order: 'asc' } } } }),
    ])
    const context = portfolioContext(site, projects.map((p) => ({ title: p.title, summary: p.summary, year: p.year, url: p.url, tags: p.tags.map((t) => ({ name: t.tag.name })) })))
    const answer = await ask(context, parsed.data.question)
    if (!answer) return c.json({ error: 'No pude responder eso. Prueba con otra pregunta.' }, 502)
    return c.json({ answer })
  })

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
