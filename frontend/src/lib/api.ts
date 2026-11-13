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

export type Tag = { id: string; name: string; iconPath: string | null; iconUrl: string | null; color: string | null }

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
  year: number | null
  cover: Media | null
  media: Media[]
}

/** Imagen que representa un medio: la propia imagen o el póster del video. */
export const stillOf = (m: Media | null) => (m ? (m.type === 'IMAGE' ? m.url : m.posterUrl) : null)

export const pad = (n: number) => String(n).padStart(2, '0')
