import {
  siAndroid, siAnthropic, siAstro, siBlender, siCplusplus, siCss, siDjango, siDocker, siDotnet, siElectron,
  siExpress, siFastapi, siFigma, siFirebase, siFlask, siFlutter, siGit, siGithub, siGo, siGodotengine, siGraphql,
  siHono, siHtml5, siJavascript, siKotlin, siLaravel, siLinux, siMongodb, siMysql, siN8n, siNextdotjs, siNodedotjs,
  siPhp, siPostgresql, siPrisma, siPython, siRailway, siReact, siRedis, siRust, siShopify, siStripe, siSupabase,
  siSvelte, siSwift, siTailwindcss, siThreedotjs, siTypescript, siUnity, siVercel, siVite, siVuedotjs, siWordpress,
} from 'simple-icons'

export type Preset = { name: string; iconPath: string; color: string | null; group: 'Tipo' | 'Tecnología' }

// Iconos pixel propios para categorías generales: listas de rectángulos [x, y, ancho, alto] en una rejilla de 24.
const px = (rects: number[][]) => rects.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h-${w}z`).join('')

const kinds: [string, number[][]][] = [
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
]

const brands: [string, { path: string; hex: string }][] = [
  ['Astro', siAstro], ['React', siReact], ['Next.js', siNextdotjs], ['Tailwind', siTailwindcss],
  ['TypeScript', siTypescript], ['JavaScript', siJavascript], ['Node.js', siNodedotjs], ['Python', siPython],
  ['PostgreSQL', siPostgresql], ['Prisma', siPrisma], ['Docker', siDocker], ['Figma', siFigma], ['Vue', siVuedotjs],
  ['Svelte', siSvelte], ['Vite', siVite], ['HTML', siHtml5], ['CSS', siCss], ['Flutter', siFlutter], ['Swift', siSwift],
  ['Kotlin', siKotlin], ['Android', siAndroid], ['Go', siGo], ['Rust', siRust], ['C++', siCplusplus], ['.NET', siDotnet],
  ['PHP', siPhp], ['Laravel', siLaravel], ['Django', siDjango], ['Flask', siFlask], ['FastAPI', siFastapi],
  ['Express', siExpress], ['Hono', siHono], ['GraphQL', siGraphql], ['Supabase', siSupabase], ['Firebase', siFirebase],
  ['MongoDB', siMongodb], ['MySQL', siMysql], ['Redis', siRedis], ['Stripe', siStripe], ['Shopify', siShopify],
  ['WordPress', siWordpress], ['Unity', siUnity], ['Godot', siGodotengine], ['Three.js', siThreedotjs],
  ['Blender', siBlender], ['Electron', siElectron], ['n8n', siN8n], ['Claude', siAnthropic], ['Git', siGit],
  ['GitHub', siGithub], ['Vercel', siVercel], ['Railway', siRailway], ['Linux', siLinux],
]

// Un logo muy oscuro no se ve sobre fondo negro: se deja sin color y toma el del texto.
const visible = (hex: string) => {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 70
}

export const PRESETS: Preset[] = [
  ...kinds.map(([name, rects]): Preset => ({ name, iconPath: px(rects), color: null, group: 'Tipo' })),
  ...brands.map(([name, icon]): Preset => ({
    name,
    iconPath: icon.path,
    color: visible(icon.hex) ? `#${icon.hex}` : null,
    group: 'Tecnología',
  })),
]
