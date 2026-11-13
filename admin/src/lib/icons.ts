import 'server-only'
import * as library from 'simple-icons'

export type IconHit = { name: string; iconPath: string; color: string | null }

// Iconos pixel propios para tipos de proyecto: rectángulos [x, y, ancho, alto] en una rejilla de 24.
const px = (rects: number[][]) => rects.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h-${w}z`).join('')
const KINDS: IconHit[] = (
  [
    ['Web', [[2, 4, 20, 3], [2, 7, 2, 13], [20, 7, 2, 13], [2, 18, 20, 2], [6, 10, 12, 2], [6, 14, 8, 2]]],
    ['Frontend', [[2, 4, 20, 3], [2, 7, 2, 13], [20, 7, 2, 13], [2, 18, 20, 2], [6, 9, 4, 7], [12, 9, 6, 3], [12, 14, 6, 2]]],
    ['Backend', [[3, 4, 18, 4], [3, 10, 18, 4], [3, 16, 18, 4]]],
    ['Full-stack', [[6, 5, 12, 3], [4, 11, 16, 3], [2, 17, 20, 3]]],
    ['Móvil', [[7, 2, 10, 2], [7, 20, 10, 2], [7, 4, 2, 16], [15, 4, 2, 16], [11, 16, 2, 2]]],
    ['Diseño', [[16, 3, 5, 5], [13, 6, 4, 4], [10, 9, 4, 4], [7, 12, 4, 4], [3, 15, 5, 6]]],
    ['Datos', [[4, 13, 4, 7], [10, 8, 4, 12], [16, 4, 4, 16]]],
    ['IA', [[11, 2, 2, 20], [2, 11, 20, 2], [9, 7, 6, 10], [7, 9, 10, 6]]],
    ['Juego', [[3, 8, 18, 8], [3, 16, 5, 3], [16, 16, 5, 3], [7, 6, 2, 2], [15, 6, 2, 2]]],
    ['API', [[4, 4, 5, 2], [4, 4, 2, 16], [4, 18, 5, 2], [15, 4, 5, 2], [18, 4, 2, 16], [15, 18, 5, 2], [10, 11, 4, 2]]],
    ['Automatización', [[12, 2, 5, 5], [9, 7, 5, 4], [6, 11, 12, 3], [10, 14, 5, 4], [7, 18, 5, 4]]],
    ['E-commerce', [[5, 9, 14, 12], [8, 4, 2, 5], [14, 4, 2, 5], [8, 4, 8, 2]]],
  ] as [string, number[][]][]
).map(([name, rects]) => ({ name, iconPath: px(rects), color: null }))

// Lo que se muestra antes de buscar: tecnologías de programación, en este orden.
const FEATURED = `astro react nextdotjs vuedotjs nuxt svelte angular solid qwik remix vite webpack tailwindcss bootstrap sass
css html5 javascript typescript nodedotjs deno bun express nestjs hono fastify python django flask fastapi go rust cplusplus
c dotnet php laravel symfony ruby rubyonrails kotlin swift dart flutter android apple expo electron tauri postgresql mysql
sqlite mongodb redis supabase firebase prisma drizzle graphql apollographql trpc docker kubernetes nginx linux ubuntu git
github gitlab githubactions vercel netlify railway cloudflare googlecloud digitalocean stripe shopify wordpress strapi
sanity contentful figma framer blender unity unrealengine godotengine threedotjs webgl opengl tensorflow pytorch
huggingface anthropic langchain ollama pandas numpy jupyter n8n zapier selenium jest vitest cypress storybook eslint
prettier npm pnpm yarn socketdotio rabbitmq apachekafka elasticsearch grafana prometheus terraform ansible arduino
raspberrypi solidity ethereum webassembly markdown swagger postman insomnia notion obsidian neovim vim jetbrains
intellijidea androidstudio xcode`.split(/\s+/)

// Un logo muy oscuro no se ve sobre fondo negro: se deja sin color y toma el del texto.
const visible = (hex: string) => {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 70
}

type LibraryIcon = { title: string; slug: string; path: string; hex: string }
const ALL = (Object.values(library) as unknown[]).filter(
  (i): i is LibraryIcon => !!i && typeof i === 'object' && 'path' in i && 'slug' in i,
)
const bySlug = new Map(ALL.map((i) => [i.slug, i]))
const toHit = (i: LibraryIcon): IconHit => ({ name: i.title, iconPath: i.path, color: visible(i.hex) ? `#${i.hex}` : null })
const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const ICON_COUNT = ALL.length + KINDS.length

/** Busca en toda la librería. Sin texto devuelve los tipos de proyecto y las tecnologías destacadas. */
export function findIcons(query: string, limit = 120): IconHit[] {
  const q = fold(query.trim())
  if (!q) return [...KINDS, ...FEATURED.flatMap((slug) => bySlug.get(slug) ?? []).map(toHit)].slice(0, limit)

  const compact = q.replace(/[^a-z0-9]/g, '')
  const ranked = ALL.flatMap((icon) => {
    const title = fold(icon.title)
    // Mejor posición: coincide desde el inicio; después, en cualquier parte del nombre.
    const rank = title.startsWith(q) || icon.slug.startsWith(compact) ? 0 : title.includes(q) || (compact && icon.slug.includes(compact)) ? 1 : -1
    return rank < 0 ? [] : [{ icon, rank }]
  }).sort((a, b) => a.rank - b.rank || a.icon.title.length - b.icon.title.length)

  return [...KINDS.filter((k) => fold(k.name).includes(q)), ...ranked.map((r) => toHit(r.icon))].slice(0, limit)
}
