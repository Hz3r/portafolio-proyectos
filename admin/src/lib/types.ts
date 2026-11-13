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

export type Tag = {
  id: string
  name: string
  iconPath: string | null
  iconUrl: string | null
  color: string | null
  skill?: boolean
  skillGroup?: string
  projectCount?: number
}

export type Person = { name: string; url: string; role: string }

export const SOCIAL_KINDS = {
  github: 'GitHub',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  x: 'X (Twitter)',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  twitch: 'Twitch',
  discord: 'Discord',
  email: 'Correo',
  web: 'Sitio web',
} as const
export type Social = { kind: keyof typeof SOCIAL_KINDS; url: string }

export type Metric = { label: string; value: string; note: string; highlight: boolean }
export type Step = { title: string; text: string }
export type Doc = { title: string; body: string }

/** Bloques con los que se arma la historia de un proyecto. */
export type Section =
  | { id: string; type: 'TEXT'; title: string; body: string }
  | { id: string; type: 'MEDIA'; title: string; mediaIds: string[]; caption: string }
  | { id: string; type: 'METRICS'; title: string; items: Metric[] }
  | { id: string; type: 'FLOW'; title: string; steps: Step[] }
  | { id: string; type: 'DOCS'; title: string; items: Doc[] }

export type Project = {
  id: string
  slug: string
  title: string
  summary: string
  description: string
  url: string | null
  status: 'DRAFT' | 'PUBLISHED'
  repoUrl: string | null
  tags: Tag[]
  sections: Section[]
  myRole: 'AUTHOR' | 'COLLABORATOR'
  myRoleNote: string
  people: Person[]
  year: number | null
  order: number
  coverMediaId: string | null
  cover: Media | null
  media: Media[]
}

export type Presign = { key: string; kind: 'IMAGE' | 'VIDEO'; uploadUrl: string; fallbackUrl: string }

/** Resultado de una acción: datos o un mensaje de error para mostrar. */
export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string }
