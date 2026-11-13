import { sign } from 'hono/jwt'
import { beforeEach, describe, expect, it } from 'vitest'
import { toEmbedUrl } from '../src/embed.ts'
import { slugify } from '../src/slug.ts'
import { app, json, login, removed, reset } from './helpers.ts'

const MB = 1024 * 1024
let token: string
const admin = (method: string, path: string, body?: unknown) => app.request(`/admin${path}`, json(method, body, token))
const create = async (body: Record<string, unknown>) => (await admin('POST', '/projects', body)).json()

beforeEach(async () => {
  await reset()
  token = await login()
})

describe('auth', () => {
  it('rechaza contraseña incorrecta', async () => {
    const res = await app.request('/auth/login', json('POST', { email: 'admin@test.dev', password: 'nope' }))
    expect(res.status).toBe(401)
  })

  it('exige token válido en /admin', async () => {
    expect((await app.request('/admin/projects')).status).toBe(401)
    expect((await app.request('/admin/projects', json('GET', undefined, 'basura'))).status).toBe(401)
    const expired = await sign(
      { sub: 'x', kind: 'session', exp: Math.floor(Date.now() / 1000) - 10 },
      'test-secret-test-secret-test-secret-1234',
      'HS256',
    )
    expect((await app.request('/admin/projects', json('GET', undefined, expired))).status).toBe(401)
    expect((await admin('GET', '/projects')).status).toBe(200)
  })

  it('no acepta un token de subida como sesión', async () => {
    const res = await admin('POST', '/uploads/presign', { filename: 'a.png', contentType: 'image/png', size: 10 })
    const { fallbackUrl } = await res.json()
    const uploadToken = new URL(fallbackUrl).searchParams.get('token')!
    expect((await app.request('/admin/projects', json('GET', undefined, uploadToken))).status).toBe(401)
  })

  it('bloquea tras 10 intentos fallidos', async () => {
    const attempt = () =>
      app.request('/auth/login', {
        ...json('POST', { email: 'admin@test.dev', password: 'nope' }),
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '9.9.9.9' },
      })
    for (let i = 0; i < 10; i++) expect((await attempt()).status).toBe(401)
    expect((await attempt()).status).toBe(429)
  })
})

describe('slug', () => {
  it('produce ASCII y nunca queda vacío', () => {
    expect(slugify('Diseño Ñandú — Año 2026!')).toBe('diseno-nandu-ano-2026')
    expect(slugify('🚀🔥')).toBe('proyecto')
    expect(slugify('   ')).toBe('proyecto')
  })

  it('añade sufijo a títulos repetidos', async () => {
    const a = await create({ title: 'Mi App' })
    const b = await create({ title: 'Mi App' })
    const c = await create({ title: 'Mi App' })
    expect([a.slug, b.slug, c.slug]).toEqual(['mi-app', 'mi-app-2', 'mi-app-3'])
  })
})

describe('proyectos', () => {
  it('la API pública solo muestra publicados, en orden', async () => {
    const a = await create({ title: 'A', status: 'PUBLISHED' })
    const draft = await create({ title: 'Borrador' })
    const b = await create({ title: 'B', status: 'PUBLISHED' })
    await admin('PATCH', '/projects/reorder', { ids: [a.id, draft.id, b.id] })

    const list = await (await app.request('/projects')).json()
    expect(list.map((p: { title: string }) => p.title)).toEqual(['A', 'B'])
    expect((await app.request('/projects/borrador')).status).toBe(404)
    expect((await app.request('/projects/a')).status).toBe(200)
    expect((await app.request('/projects/no-existe')).status).toBe(404)
  })

  it('un proyecto nuevo entra arriba', async () => {
    await create({ title: 'Viejo', status: 'PUBLISHED' })
    await create({ title: 'Nuevo', status: 'PUBLISHED' })
    const list = await (await app.request('/projects')).json()
    expect(list[0].title).toBe('Nuevo')
  })

  it('valida y normaliza campos', async () => {
    expect((await admin('POST', '/projects', { title: '  ' })).status).toBe(400)
    expect((await admin('POST', '/projects', { title: 'X', url: 'javascript:alert(1)' })).status).toBe(400)
    const p = await create({ title: 'X', url: '' })
    expect(p.url).toBeNull()
    const updated = await (await admin('PATCH', `/projects/${p.id}`, { url: 'https://example.com', year: 2026 })).json()
    expect(updated).toMatchObject({ url: 'https://example.com', year: 2026, slug: 'x' })
  })

  it('al borrar elimina medios y archivos', async () => {
    const p = await create({ title: 'Con medios' })
    await admin('POST', `/projects/${p.id}/media`, { type: 'IMAGE', key: 'projects/a.png' })
    await admin('POST', `/projects/${p.id}/media`, { type: 'VIDEO', key: 'projects/b.mp4', posterKey: 'projects/b.jpg' })
    expect((await admin('DELETE', `/projects/${p.id}`)).status).toBe(200)
    expect(removed.sort()).toEqual(['projects/a.png', 'projects/b.jpg', 'projects/b.mp4'])
    expect((await admin('GET', `/projects/${p.id}`)).status).toBe(404)
  })
})

describe('archivos', () => {
  const presign = (contentType: string, size: number) =>
    admin('POST', '/uploads/presign', { filename: 'Mi Foto (1).PNG', contentType, size })

  it('aplica formatos y límites de tamaño', async () => {
    expect((await presign('application/pdf', 10)).status).toBe(400)
    expect((await presign('image/svg+xml', 2 * MB)).status).toBe(400)
    expect((await presign('image/svg+xml', 10)).status).toBe(200)
    expect((await presign('image/png', 16 * MB)).status).toBe(400)
    expect((await presign('video/mp4', 501 * MB)).status).toBe(400)
    expect((await presign('image/png', 0)).status).toBe(400)

    const ok = await presign('video/mp4', 100 * MB)
    expect(ok.status).toBe(200)
    const body = await ok.json()
    expect(body.key).toMatch(/^projects\/[\w-]+-Mi-Foto-1\.mp4$/)
    expect(body.uploadUrl).toContain(body.key)
  })

  it('registra, ordena, usa portada y borra medios', async () => {
    const p = await create({ title: 'Galería', status: 'PUBLISHED' })
    const img1 = await (await admin('POST', `/projects/${p.id}/media`, { type: 'IMAGE', key: 'projects/1.png', width: 800, height: 600 })).json()
    const img2 = await (await admin('POST', `/projects/${p.id}/media`, { type: 'IMAGE', key: 'projects/2.png' })).json()
    expect(img1.url).toBe('http://api.test/media/projects/1.png')

    await admin('PATCH', `/projects/${p.id}/media/reorder`, { ids: [img2.id, img1.id] })
    let pub = await (await app.request('/projects/galeria')).json()
    expect(pub.media.map((m: { id: string }) => m.id)).toEqual([img2.id, img1.id])
    expect(pub.cover.id).toBe(img2.id)

    await admin('PATCH', `/projects/${p.id}`, { coverMediaId: img1.id })
    pub = await (await app.request('/projects/galeria')).json()
    expect(pub.cover.id).toBe(img1.id)

    const other = await create({ title: 'Otro' })
    expect((await admin('PATCH', `/projects/${other.id}`, { coverMediaId: img1.id })).status).toBe(400)

    expect((await admin('DELETE', `/media/${img1.id}`)).status).toBe(200)
    expect(removed).toEqual(['projects/1.png'])
    pub = await (await app.request('/projects/galeria')).json()
    expect(pub.cover.id).toBe(img2.id)
  })

  it('rechaza claves fuera de projects/', async () => {
    const p = await create({ title: 'K' })
    expect((await admin('POST', `/projects/${p.id}/media`, { type: 'IMAGE', key: '../secreto' })).status).toBe(400)
    expect((await app.request('/media/otra/cosa.png')).status).toBe(404)
    const ok = await app.request('/media/projects/1.png')
    expect(ok.status).toBe(302)
    expect(ok.headers.get('location')).toBe('https://bucket.test/read/projects/1.png')
  })

  it('solo acepta embeds de YouTube y Vimeo', async () => {
    expect(toEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(toEmbedUrl('https://youtu.be/dQw4w9WgXcQ?t=3')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(toEmbedUrl('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(toEmbedUrl('https://vimeo.com/123456789')).toBe('https://player.vimeo.com/video/123456789')
    expect(toEmbedUrl('https://evil.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(toEmbedUrl('no es url')).toBeNull()

    const p = await create({ title: 'E' })
    expect((await admin('POST', `/projects/${p.id}/media`, { type: 'EMBED', embedUrl: 'https://evil.com/x' })).status).toBe(400)
    const ok = await admin('POST', `/projects/${p.id}/media`, { type: 'EMBED', embedUrl: 'https://vimeo.com/123456789' })
    expect((await ok.json()).embedUrl).toBe('https://player.vimeo.com/video/123456789')
  })

  it('la subida de respaldo exige token y tamaño exacto', async () => {
    expect((await app.request('/uploads/proxy?token=basura', { method: 'PUT', body: 'x' })).status).toBe(401)
    const { fallbackUrl } = await (await presign('image/png', 4)).json()
    const path = fallbackUrl.replace('http://api.test', '')
    const send = (body: string) =>
      app.request(path, { method: 'PUT', body, headers: { 'content-length': String(body.length) } })
    expect((await send('demasiado')).status).toBe(400)
    expect((await send('abcd')).status).toBe(200)
  })
})

describe('etiquetas', () => {
  const tag = async (body: Record<string, unknown>) => (await admin('POST', '/tags', body)).json()

  it('crea etiquetas con icono y las asigna en orden', async () => {
    const astro = await tag({ name: 'Astro', iconPath: 'M1 2h3v4z', color: '#BC52EE' })
    const web = await tag({ name: 'Web' })
    expect(astro).toMatchObject({ name: 'Astro', iconPath: 'M1 2h3v4z', color: '#BC52EE', projectCount: 0 })

    const p = await create({ title: 'T', status: 'PUBLISHED', tagIds: [web.id, astro.id, 'no-existe', web.id] })
    expect(p.tags.map((t: { name: string }) => t.name)).toEqual(['Web', 'Astro'])

    await admin('PATCH', `/projects/${p.id}`, { tagIds: [astro.id] })
    const pub = await (await app.request('/projects/t')).json()
    expect(pub.tags).toEqual([
      { id: astro.id, name: 'Astro', iconPath: 'M1 2h3v4z', iconUrl: null, color: '#BC52EE', skill: false, skillGroup: '' },
    ])
    const list = await (await admin('GET', '/tags')).json()
    expect(list.map((t: { name: string; projectCount: number }) => [t.name, t.projectCount])).toEqual([['Astro', 1], ['Web', 0]])
  })

  it('rechaza duplicados, iconos con marcado y colores inválidos', async () => {
    await tag({ name: 'React' })
    expect((await admin('POST', '/tags', { name: 'react' })).status).toBe(409)
    expect((await admin('POST', '/tags', { name: 'X', iconPath: '"/><script>alert(1)</script>' })).status).toBe(400)
    expect((await admin('POST', '/tags', { name: 'X', color: 'red' })).status).toBe(400)
    expect((await admin('POST', '/tags', { name: '' })).status).toBe(400)
  })

  it('al borrar o cambiar el icono elimina el archivo y desvincula proyectos', async () => {
    const t = await tag({ name: 'Logo', iconKey: 'projects/logo.svg' })
    expect(t.iconUrl).toBe('http://api.test/media/projects/logo.svg')
    const p = await create({ title: 'Con etiqueta', tagIds: [t.id] })

    await admin('PATCH', `/tags/${t.id}`, { iconKey: 'projects/nuevo.png' })
    expect(removed).toEqual(['projects/logo.svg'])
    expect((await admin('DELETE', `/tags/${t.id}`)).status).toBe(200)
    expect(removed).toEqual(['projects/logo.svg', 'projects/nuevo.png'])
    expect((await (await admin('GET', `/projects/${p.id}`)).json()).tags).toEqual([])
  })
})

describe('historia', () => {
  it('guarda bloques, resuelve galerías y enlaza el repositorio', async () => {
    const p = await create({ title: 'Historia', status: 'PUBLISHED' })
    const img = await (await admin('POST', `/projects/${p.id}/media`, { type: 'IMAGE', key: 'projects/h.png' })).json()
    const res = await admin('PATCH', `/projects/${p.id}`, {
      repoUrl: 'https://github.com/user/repo',
      sections: [
        { id: 'a', type: 'TEXT', title: 'El reto', body: 'Texto' },
        { id: 'b', type: 'METRICS', title: 'Resultados', items: [{ label: 'Ingresos', value: '$4,200', highlight: true }] },
        { id: 'c', type: 'FLOW', title: 'Cómo funciona', steps: [{ title: 'Entrada', text: 'Llega el dato' }] },
        { id: 'd', type: 'MEDIA', title: 'Pantallas', mediaIds: [img.id, 'borrado'] },
        { id: 'e', type: 'DOCS', title: 'Documentación', items: [{ title: 'Instalación', body: '`npm i`' }] },
      ],
    })
    expect(res.status).toBe(200)
    const pub = await (await app.request('/projects/historia')).json()
    expect(pub.repoUrl).toBe('https://github.com/user/repo')
    expect(pub.sections.map((s: { type: string }) => s.type)).toEqual(['TEXT', 'METRICS', 'FLOW', 'MEDIA', 'DOCS'])
    expect(pub.sections[1].items[0]).toEqual({ label: 'Ingresos', value: '$4,200', note: '', highlight: true })
    expect(pub.sections[3].media.map((m: { id: string }) => m.id)).toEqual([img.id])
  })

  it('rechaza bloques desconocidos y repositorios que no son enlaces', async () => {
    const p = await create({ title: 'V' })
    expect((await admin('PATCH', `/projects/${p.id}`, { sections: [{ id: 'x', type: 'SCRIPT' }] })).status).toBe(400)
    expect((await admin('PATCH', `/projects/${p.id}`, { repoUrl: 'javascript:alert(1)' })).status).toBe(400)
  })
})

describe('ajustes', () => {
  it('el encabezado del sitio se edita desde el panel y se lee en público', async () => {
    expect(await (await app.request('/site')).json()).toEqual({ handle: '', tagline: '', link: '', socials: [], skills: [] })
    expect((await app.request('/admin/site', json('PATCH', { handle: 'x' }))).status).toBe(401)
    expect((await admin('PATCH', '/site', { link: 'javascript:alert(1)' })).status).toBe(400)
    await admin('PATCH', '/site', { handle: '@hz3r', tagline: 'Cosas que construyo' })
    await admin('PATCH', '/site', { link: 'https://instagram.com/hz3r' })
    expect(await (await app.request('/site')).json()).toMatchObject({
      handle: '@hz3r',
      tagline: 'Cosas que construyo',
      link: 'https://instagram.com/hz3r',
    })
  })

  it('guarda redes sociales y agrupa las habilidades', async () => {
    expect((await admin('PATCH', '/site', { socials: [{ kind: 'github', url: 'javascript:alert(1)' }] })).status).toBe(400)
    expect((await admin('PATCH', '/site', { socials: [{ kind: 'myspace', url: 'https://x.com/a' }] })).status).toBe(400)
    await admin('PATCH', '/site', {
      socials: [
        { kind: 'github', url: 'https://github.com/hz3r' },
        { kind: 'email', url: 'hola@ejemplo.dev' },
      ],
    })
    const react = await (await admin('POST', '/tags', { name: 'React', skill: true, skillGroup: 'Frontend' })).json()
    await admin('POST', '/tags', { name: 'Astro', skill: true, skillGroup: 'Frontend' })
    await admin('POST', '/tags', { name: 'Figma', skill: true })
    await admin('POST', '/tags', { name: 'Oculta' })
    await create({ title: 'Publicado', status: 'PUBLISHED', tagIds: [react.id] })
    await create({ title: 'Borrador', tagIds: [react.id] })

    const site = await (await app.request('/site')).json()
    expect(site.socials).toEqual([
      { kind: 'github', url: 'https://github.com/hz3r' },
      { kind: 'email', url: 'mailto:hola@ejemplo.dev' },
    ])
    expect(site.skills.map((g: { group: string; tags: { name: string; projectCount: number }[] }) => [g.group, g.tags.map((t) => `${t.name}:${t.projectCount}`)])).toEqual([
      ['Frontend', ['Astro:0', 'React:1']],
      ['', ['Figma:0']],
    ])
  })

  it('guarda los créditos de un proyecto', async () => {
    const p = await create({ title: 'Equipo', status: 'PUBLISHED' })
    expect(p).toMatchObject({ myRole: 'AUTHOR', myRoleNote: '', people: [] })
    expect((await admin('PATCH', `/projects/${p.id}`, { people: [{ name: 'Ana', url: 'javascript:x' }] })).status).toBe(400)
    expect((await admin('PATCH', `/projects/${p.id}`, { myRole: 'JEFE' })).status).toBe(400)
    await admin('PATCH', `/projects/${p.id}`, {
      myRole: 'COLLABORATOR',
      myRoleNote: 'Backend',
      people: [{ name: 'Ana', url: 'https://github.com/ana', role: 'Autora' }, { name: 'Luis' }],
    })
    const pub = await (await app.request('/projects/equipo')).json()
    expect(pub).toMatchObject({
      myRole: 'COLLABORATOR',
      myRoleNote: 'Backend',
      people: [
        { name: 'Ana', url: 'https://github.com/ana', role: 'Autora' },
        { name: 'Luis', url: '', role: '' },
      ],
    })
  })

  it('cambiar correo o contraseña exige la contraseña actual', async () => {
    expect(await (await admin('GET', '/account')).json()).toEqual({ email: 'admin@test.dev' })
    expect((await admin('PATCH', '/account', { currentPassword: 'mala', newPassword: 'nueva-clave-1' })).status).toBe(403)
    expect((await admin('PATCH', '/account', { currentPassword: 'correct-horse', newPassword: 'corta' })).status).toBe(400)
    expect((await admin('PATCH', '/account', { currentPassword: 'correct-horse', email: 'no-es-correo' })).status).toBe(400)

    const res = await admin('PATCH', '/account', { currentPassword: 'correct-horse', email: 'Nuevo@Test.dev', newPassword: 'nueva-clave-1' })
    expect(await res.json()).toEqual({ email: 'nuevo@test.dev' })
    const attempt = (email: string, password: string) => app.request('/auth/login', json('POST', { email, password }))
    expect((await attempt('admin@test.dev', 'correct-horse')).status).toBe(401)
    expect((await attempt('nuevo@test.dev', 'nueva-clave-1')).status).toBe(200)
  })
})
