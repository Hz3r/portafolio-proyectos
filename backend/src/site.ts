import { z } from 'zod'
import type { Db } from './db.ts'
import { readPortfolio, serializePortfolio } from './portfolio.ts'
import { type MediaUrl, serializeTag } from './serialize.ts'

export const SOCIAL_KINDS = ['github', 'linkedin', 'instagram', 'x', 'youtube', 'tiktok', 'twitch', 'discord', 'email', 'web'] as const

/**
 * Una red: una de las conocidas, o `custom` con nombre e icono propios
 * (trazo de la librería o imagen subida, igual que las etiquetas).
 */
const socialSchema = z
  .object({
    kind: z.enum([...SOCIAL_KINDS, 'custom']),
    url: z.string().trim().min(1).max(500),
    label: z.string().trim().max(30).optional(),
    iconPath: z
      .string()
      .max(12000)
      .regex(/^[MmLlHhVvCcSsQqTtAaZz0-9\s,.\-eE]+$/, 'Icono inválido')
      .nullable()
      .optional(),
    iconKey: z
      .string()
      .regex(/^projects\/[\w.-]+$/, 'Archivo inválido')
      .nullable()
      .optional(),
  })
  .refine((s) => s.kind !== 'custom' || !!s.label, { message: 'Ponle nombre a cada red que añadas.' })
  // El nombre y el icono propios solo existen en las redes creadas por ti.
  .transform(({ kind, url, label, iconPath, iconKey }) => (kind === 'custom' ? { kind, url, label, iconPath: iconPath ?? null, iconKey: iconKey ?? null } : { kind, url }))
  .transform((s) => (s.kind === 'email' && !s.url.startsWith('mailto:') && s.url.includes('@') ? { ...s, url: `mailto:${s.url}` } : s))
  .refine((s) => (s.kind === 'email' ? /^mailto:\S+@\S+\.\S+$/.test(s.url) : /^https?:\/\/\S+\.\S+/.test(s.url)), {
    message: 'Revisa los enlaces de tus redes: deben empezar con https:// (o ser un correo válido).',
  })

export const HOME_PAGES = ['PROJECTS', 'PORTFOLIO'] as const

export const socialsSchema = z.array(socialSchema).max(24)
type Social = z.infer<typeof socialSchema>

export function readSocials(value: unknown): Social[] {
  const parsed = socialsSchema.safeParse(value ?? [])
  return parsed.success ? parsed.data : []
}
export const socialKeys = (socials: Social[]): string[] => socials.flatMap((s) => ('iconKey' in s && s.iconKey ? [s.iconKey] : []))

/** Perfil público: encabezado, redes, habilidades agrupadas y el contenido del portafolio. */
export async function readSite(db: Db, mediaUrl: MediaUrl) {
  const [site, skills] = await Promise.all([
    db.siteSettings.findUnique({ where: { id: 1 } }),
    db.tag.findMany({
      where: { skill: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { projects: { where: { project: { status: 'PUBLISHED' } } } } } },
    }),
  ])
  const socials = readSocials(site?.socials).map((s) => ('iconKey' in s ? { ...s, iconUrl: s.iconKey ? mediaUrl(s.iconKey) : null } : s))

  // Grupos en orden alfabético; las habilidades sin grupo van al final.
  const groups = new Map<string, ReturnType<typeof skillOf>[]>()
  const skillOf = (t: (typeof skills)[number]) => ({ ...serializeTag(t, mediaUrl), projectCount: t._count.projects })
  for (const t of skills) groups.set(t.skillGroup, [...(groups.get(t.skillGroup) ?? []), skillOf(t)])
  const ordered = [...groups.entries()].sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b, 'es')))

  return {
    handle: site?.handle ?? '',
    tagline: site?.tagline ?? '',
    link: site?.link ?? '',
    socials,
    home: site?.home === 'PORTFOLIO' ? 'PORTFOLIO' : 'PROJECTS',
    portfolio: serializePortfolio(readPortfolio(site?.portfolio), mediaUrl),
    skills: ordered.map(([group, tags]) => ({ group, tags })),
  }
}
