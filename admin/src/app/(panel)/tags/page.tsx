import TagManager from '@/components/TagManager'
import { admin } from '@/lib/api'
import { findIcons, ICON_COUNT } from '@/lib/icons'
import type { Tag } from '@/lib/types'

export default async function TagsPage() {
  const res = await admin<Tag[]>('/tags')
  return (
    <main className="pt-10">
      <h1 className="text-3xl font-semibold tracking-tight">Etiquetas</h1>
      <p className="text-dim mt-2 max-w-xl">
        Tecnologías y tipos de proyecto. Aparecen con su icono en el sitio y sirven de filtro en la portada.
      </p>
      {res.ok ? (
        <TagManager initial={res.data} featured={findIcons('')} total={ICON_COUNT} />
      ) : (
        <p role="alert" className="border-danger/40 text-danger mt-8 rounded-2xl border p-5">
          {res.error}
        </p>
      )}
    </main>
  )
}
