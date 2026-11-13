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

export type Project = {
  id: string
  slug: string
  title: string
  summary: string
  description: string
  url: string | null
  tags: string[]
  year: number | null
  cover: Media | null
  media: Media[]
}

/** Imagen que representa un medio: la propia imagen o el póster del video. */
export const stillOf = (m: Media | null) => (m ? (m.type === 'IMAGE' ? m.url : m.posterUrl) : null)

export const pad = (n: number) => String(n).padStart(2, '0')
