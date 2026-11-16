import type { APIRoute } from 'astro'
import { getProjects, siteOrigin } from '../lib/server'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Las páginas publicadas y cada proyecto publicado. Los borradores no aparecen.
export const GET: APIRoute = async ({ url }) => {
  const origin = siteOrigin(url)
  const { projects } = await getProjects()
  const paths = ['/', '/portafolio', '/proyectos', ...projects.map((p) => `/p/${p.slug}`)]
  const body = paths.map((p) => `  <url><loc>${esc(origin + p)}</loc></url>`).join('\n')
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
