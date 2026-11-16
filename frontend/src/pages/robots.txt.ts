import type { APIRoute } from 'astro'
import { siteOrigin } from '../lib/server'

// Todo el sitio es público; la API de la terminal no hace falta que la rastreen.
export const GET: APIRoute = ({ url }) =>
  new Response(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${siteOrigin(url)}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
