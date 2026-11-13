export type Media = {
  id: string
  type: 'IMAGE' | 'VIDEO' | 'EMBED'
  url: string | null
  posterUrl: string | null
  embedUrl: string | null
  alt: string
  width: number | null
  height: number | null
}

export type Tag = {
  id: string
  name: string
  iconPath: string | null
  iconUrl: string | null
  color: string | null
  projectCount?: number
  /** Solo en habilidades: 3 la domino, 2 la uso con soltura, 1 la estoy aprendiendo. */
  skillLevel?: number
}

export type Person = { name: string; url: string; role: string }
export type Social = { kind: string; url: string }
export type SkillGroup = { group: string; tags: Tag[] }

export type JourneyItem = {
  id: string
  kind: 'WORK' | 'EDUCATION' | 'CERT' | 'MILESTONE'
  title: string
  place: string
  period: string
  text: string
  url: string
}

/** Contenido de la página de portafolio. Lo vacío no se muestra. */
export type Portfolio = {
  name: string
  role: string
  headline: string
  intro: string
  location: string
  available: boolean
  availableNote: string
  avatarUrl: string | null
  cvHref: string | null
  about: string
  stats: { id: string; value: string; label: string }[]
  journey: JourneyItem[]
  services: { id: string; title: string; text: string }[]
  contactTitle: string
  contactText: string
  contactEmail: string
}

/** Rutas fijas de las dos páginas; la raíz muestra la que se elija en el panel. */
export const ROUTES = { projects: '/proyectos', portfolio: '/portafolio' } as const

/** Enlace a la página de proyectos con una etiqueta ya filtrada. */
export const tagHref = (tag: Tag) => `${ROUTES.projects}?tag=${encodeURIComponent(tag.name)}`

/** Lo que la vista rápida y los créditos necesitan saber del dueño del sitio. */
export type Owner = { handle: string; github: string | null }

/** Bloques de la historia de un proyecto, en orden. */
export type Section =
  | { id: string; type: 'TEXT'; title: string; body: string }
  | { id: string; type: 'MEDIA'; title: string; mediaIds: string[]; media: Media[]; caption: string }
  | { id: string; type: 'METRICS'; title: string; items: { label: string; value: string; note: string; highlight: boolean }[] }
  | { id: string; type: 'FLOW'; title: string; steps: { title: string; text: string }[] }
  | { id: string; type: 'DOCS'; title: string; items: { title: string; body: string }[] }

export type Project = {
  id: string
  slug: string
  title: string
  summary: string
  description: string
  url: string | null
  repoUrl: string | null
  tags: Tag[]
  sections: Section[]
  myRole: 'AUTHOR' | 'COLLABORATOR'
  myRoleNote: string
  people: Person[]
  year: number | null
  cover: Media | null
  media: Media[]
}

/** Imagen que representa un medio: la propia imagen o el póster del video. */
export const stillOf = (m: Media | null) => (m ? (m.type === 'IMAGE' ? m.url : m.posterUrl) : null)

export const pad = (n: number) => String(n).padStart(2, '0')

/** Foto de perfil de GitHub si el enlace apunta a un usuario de GitHub. */
export function githubAvatar(url: string | null | undefined): string | null {
  const user = url?.match(/^https?:\/\/(?:www\.)?github\.com\/([\w-]+)\/?$/)?.[1]
  return user ? `https://github.com/${user}.png?size=96` : null
}

/** Texto plano a partir de Markdown, recortado para un resumen. */
export function excerpt(markdown: string, max = 320): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s.*$/gm, ' ') // los títulos no forman parte del resumen
    .replace(/^\s{0,3}(>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 40)).replace(/[.,;:]$/, '')}…`
}
