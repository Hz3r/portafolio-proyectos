import { z } from 'zod'

// Bloques con los que se arma la historia de un proyecto.
const base = { id: z.string().min(1).max(40), title: z.string().trim().max(120).default('') }
const line = (max: number) => z.string().trim().max(max).default('')

export const sectionSchema = z.discriminatedUnion('type', [
  z.object({ ...base, type: z.literal('TEXT'), body: z.string().max(20000).default('') }),
  z.object({ ...base, type: z.literal('MEDIA'), mediaIds: z.array(z.string()).max(40).default([]), caption: line(300) }),
  z.object({
    ...base,
    type: z.literal('METRICS'),
    items: z
      .array(z.object({ label: line(60), value: line(40), note: line(140), highlight: z.boolean().default(false) }))
      .max(12)
      .default([]),
  }),
  z.object({
    ...base,
    type: z.literal('FLOW'),
    steps: z.array(z.object({ title: line(100), text: z.string().trim().max(1000).default('') })).max(20).default([]),
  }),
  z.object({
    ...base,
    type: z.literal('DOCS'),
    items: z.array(z.object({ title: line(120), body: z.string().max(20000).default('') })).max(30).default([]),
  }),
])

export const sectionsSchema = z.array(sectionSchema).max(30)
export type Section = z.infer<typeof sectionSchema>

/** Lee lo guardado en la base; si algo no encaja con el esquema, lo descarta. */
export function readSections(value: unknown): Section[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const parsed = sectionSchema.safeParse(item)
    return parsed.success ? [parsed.data] : []
  })
}
