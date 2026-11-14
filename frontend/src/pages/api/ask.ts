import type { APIRoute } from 'astro'
import { askBackend } from '../../lib/server'

// La terminal del portafolio pregunta aquí; el sitio reenvía la pregunta al backend con la IP del visitante,
// que es la que cuenta para el límite de preguntas.
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const body = (await request.json().catch(() => null)) as { question?: unknown } | null
  const question = typeof body?.question === 'string' ? body.question : ''
  const ip = (request.headers.get('x-forwarded-for') ?? clientAddress ?? 'local').split(',')[0].trim()
  const { status, body: answer } = await askBackend(question, ip)
  return new Response(JSON.stringify(answer ?? { error: 'Sin respuesta.' }), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
}
