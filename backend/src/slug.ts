import type { Db } from './db.ts'

export function slugify(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')
  return slug || 'proyecto'
}

export async function uniqueSlug(db: Db, base: string, excludeId?: string): Promise<string> {
  const root = slugify(base)
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`
    const existing = await db.project.findUnique({ where: { slug: candidate }, select: { id: true } })
    if (!existing || existing.id === excludeId) return candidate
  }
}
