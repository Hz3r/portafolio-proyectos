import { z } from 'zod'

const personSchema = z.object({
  name: z.string().trim().min(1, 'Cada persona necesita un nombre').max(60),
  url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === '' || /^https?:\/\/\S+\.\S+/.test(v), 'El enlace debe empezar con http:// o https://')
    .default(''),
  role: z.string().trim().max(60).default(''),
})

/** Otras personas de un proyecto: colaboradores, o el equipo si yo soy colaborador. */
export const peopleSchema = z.array(personSchema).max(12)
export type Person = z.infer<typeof personSchema>

export function readPeople(value: unknown): Person[] {
  const parsed = peopleSchema.safeParse(value)
  return parsed.success ? parsed.data : []
}
