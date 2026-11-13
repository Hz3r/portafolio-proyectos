import type { Media, Project } from './generated/prisma/client.ts'

export type MediaUrl = (key: string) => string

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

export function serializeProject(p: Project & { media: Media[] }, url: MediaUrl) {
  const media = [...p.media].sort((a, b) => a.order - b.order)
  const cover =
    media.find((m) => m.id === p.coverMediaId) ??
    media.find((m) => m.type === 'IMAGE') ??
    media.find((m) => m.posterKey) ??
    null
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    description: p.description,
    url: p.url,
    status: p.status,
    tags: p.tags,
    year: p.year,
    order: p.order,
    coverMediaId: p.coverMediaId,
    cover: cover ? serializeMedia(cover, url) : null,
    media: media.map((m) => serializeMedia(m, url)),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}
