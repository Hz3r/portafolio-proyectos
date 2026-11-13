export type Media = {
  id: string
  type: 'IMAGE' | 'VIDEO' | 'EMBED'
  url: string | null
  posterUrl: string | null
  embedUrl: string | null
  alt: string
  width: number | null
  height: number | null
  order: number
}

export type Project = {
  id: string
  slug: string
  title: string
  summary: string
  description: string
  url: string | null
  status: 'DRAFT' | 'PUBLISHED'
  tags: string[]
  year: number | null
  order: number
  coverMediaId: string | null
  cover: Media | null
  media: Media[]
}

export type Presign = { key: string; kind: 'IMAGE' | 'VIDEO'; uploadUrl: string; fallbackUrl: string }

/** Resultado de una acción: datos o un mensaje de error para mostrar. */
export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string }
