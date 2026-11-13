import { z } from 'zod'
import type { MediaUrl } from './serialize.ts'

const link = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((v) => v === '' || /^https?:\/\/\S+\.\S+/.test(v), 'Los enlaces deben empezar con http:// o https://')
    .default('')
const text = (max: number) => z.string().trim().max(max).default('')
const key = z
  .string()
  .regex(/^projects\/[\w.-]+$/, 'Archivo inválido')
  .nullable()
  .default(null)
const id = z.string().min(1).max(40)

export const JOURNEY_KINDS = ['WORK', 'EDUCATION', 'CERT', 'MILESTONE'] as const

/** Contenido de la página de portafolio. Todo es opcional: una sección vacía no se muestra. */
export const portfolioSchema = z.object({
  name: text(60),
  role: text(80),
  headline: text(140),
  intro: text(400),
  location: text(80),
  available: z.boolean().default(false),
  availableNote: text(80),
  avatarKey: key,
  cvKey: key,
  cvUrl: link(),
  about: text(4000),
  stats: z.array(z.object({ id, value: z.string().trim().min(1, 'Cada cifra necesita un valor').max(12), label: text(40) })).max(6).default([]),
  journey: z
    .array(
      z.object({
        id,
        kind: z.enum(JOURNEY_KINDS).default('WORK'),
        title: z.string().trim().min(1, 'Cada etapa de la trayectoria necesita un título').max(80),
        place: text(80),
        period: text(40),
        text: text(600),
        url: link(),
      }),
    )
    .max(30)
    .default([]),
  services: z
    .array(z.object({ id, title: z.string().trim().min(1, 'Cada servicio necesita un título').max(60), text: text(300) }))
    .max(8)
    .default([]),
  contactTitle: text(100),
  contactText: text(300),
  contactEmail: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === '' || /^\S+@\S+\.\S+$/.test(v), 'El correo de contacto no es válido')
    .default(''),
})

export type Portfolio = z.infer<typeof portfolioSchema>

export function readPortfolio(value: unknown): Portfolio {
  const parsed = portfolioSchema.safeParse(value ?? {})
  return parsed.success ? parsed.data : portfolioSchema.parse({})
}

/** El portafolio con las direcciones de sus archivos. `cvHref` es el PDF subido o, si no hay, el enlace. */
export function serializePortfolio(p: Portfolio, url: MediaUrl) {
  return {
    ...p,
    avatarUrl: p.avatarKey ? url(p.avatarKey) : null,
    cvHref: p.cvKey ? url(p.cvKey) : p.cvUrl || null,
  }
}
