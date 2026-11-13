import type { Media, Project, ProjectTag, Tag } from './generated/prisma/client.ts'
import { readPeople } from './people.ts'
import { readSections } from './sections.ts'

export type MediaUrl = (key: string) => string

/** Relaciones que necesita `serializeProject`. */
export const projectInclude = {
  media: true,
  tags: { include: { tag: true }, orderBy: { order: 'asc' } },
} as const

type FullProject = Project & { media: Media[]; tags: (ProjectTag & { tag: Tag })[] }

export function serializeMedia(m: Media, url: MediaUrl) {
  return {
    id: m.id,
    type: m.type,
    url: m.key ? url(m.key) : null,
    posterUrl: m.posterKey ? url(m.posterKey) : null,
    embedUrl: m.embedUrl,
    alt: m.alt,
    width: m.width,
    height: m.height,
    order: m.order,
  }
}

export function serializeTag(t: Tag, url: MediaUrl) {
  return {
    id: t.id,
    name: t.name,
    iconPath: t.iconPath,
    iconUrl: t.iconKey ? url(t.iconKey) : null,
    color: t.color,
    skill: t.skill,
    skillGroup: t.skillGroup,
  }
}

export function serializeProject(p: FullProject, url: MediaUrl) {
  const media = [...p.media].sort((a, b) => a.order - b.order).map((m) => serializeMedia(m, url))
  const byId = new Map(media.map((m) => [m.id, m]))
  const cover =
    media.find((m) => m.id === p.coverMediaId) ??
    media.find((m) => m.type === 'IMAGE') ??
    media.find((m) => m.posterUrl) ??
    null
  // Los bloques de galería llevan sus medios resueltos; los borrados se omiten.
  const sections = readSections(p.sections).map((s) =>
    s.type === 'MEDIA' ? { ...s, media: s.mediaIds.flatMap((id) => byId.get(id) ?? []) } : s,
  )
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    description: p.description,
    url: p.url,
    repoUrl: p.repoUrl,
    status: p.status,
    tags: p.tags.map((pt) => serializeTag(pt.tag, url)),
    year: p.year,
    order: p.order,
    coverMediaId: p.coverMediaId,
    cover,
    media,
    sections,
    myRole: p.myRole === 'COLLABORATOR' ? 'COLLABORATOR' : 'AUTHOR',
    myRoleNote: p.myRoleNote,
    people: readPeople(p.people),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}
