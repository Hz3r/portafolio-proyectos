'use client'

import { useState } from 'react'
import { deleteTag } from '@/app/actions'
import type { IconHit } from '@/lib/icons'
import type { Tag } from '@/lib/types'
import TagForm from './TagForm'
import { TagIcon } from './ui'

const sorted = (list: Tag[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'))

export default function TagManager({ initial, featured, total }: { initial: Tag[]; featured: IconHit[]; total: number }) {
  const [tags, setTags] = useState(initial)
  const [editing, setEditing] = useState<Tag | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  const q = query.trim().toLowerCase()
  const visible = tags.filter((t) => !q || t.name.toLowerCase().includes(q))
  const resetForm = () => (setEditing(null), setFormKey((k) => k + 1))

  const remove = async (t: Tag) => {
    const used = t.projectCount ? ` Se quitará de ${t.projectCount} ${t.projectCount === 1 ? 'proyecto' : 'proyectos'}.` : ''
    if (!confirm(`¿Borrar la etiqueta “${t.name}”?${used}`)) return
    const res = await deleteTag(t.id)
    if (!res.ok) return setError(res.error)
    setTags((list) => list.filter((x) => x.id !== t.id))
    if (editing?.id === t.id) resetForm()
  }

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[24rem_minmax(0,1fr)] lg:items-start">
      <section id="tag-form" className="bg-surface border-line scroll-mt-6 rounded-2xl border p-5 lg:sticky lg:top-6" aria-labelledby="form-title">
        <h2 id="form-title" className="mb-5 text-lg font-semibold">
          {editing ? `Editar “${editing.name}”` : 'Nueva etiqueta'}
        </h2>
        <TagForm
          key={`${editing?.id ?? 'new'}-${formKey}`}
          tag={editing}
          featured={featured}
          total={total}
          groups={[...new Set(tags.flatMap((t) => t.skillGroup || []))]}
          onCancel={editing ? resetForm : undefined}
          onSaved={(tag) => {
            setTags((list) => sorted([...list.filter((t) => t.id !== tag.id), { projectCount: 0, ...tag }]))
            resetForm()
          }}
        />
      </section>

      <section aria-labelledby="mine">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="mine" className="text-lg font-semibold">
            Tus etiquetas <span className="pixel text-accent ml-1">{tags.length}</span>
          </h2>
          {tags.length > 8 && (
            <input
              className="field max-w-52 !rounded-full !py-2"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar"
              aria-label="Filtrar tus etiquetas"
            />
          )}
        </div>
        {error && (
          <p role="alert" className="text-danger mt-3 text-sm">
            {error}
          </p>
        )}
        {tags.length === 0 ? (
          <p className="border-line text-dim mt-4 rounded-2xl border border-dashed px-5 py-10 text-center">
            Aún no tienes etiquetas. Busca un icono, ponle nombre y créala.
          </p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {visible.map((t) => (
              <li key={t.id} className={`bg-surface flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${editing?.id === t.id ? 'border-accent' : 'border-line'}`}>
                <span className="bg-raised flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <TagIcon tag={t} size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{t.name}</span>
                  <span className="text-dim text-xs">
                    {t.skill && <span className="text-accent">Habilidad{t.skillGroup ? ` de ${t.skillGroup}` : ''}. </span>}
                    {t.projectCount ? `${t.projectCount} ${t.projectCount === 1 ? 'proyecto' : 'proyectos'}` : 'Sin usar'}
                  </span>
                </span>
                <button
                  type="button"
                  className="text-dim hover:text-ink px-1 py-2 text-sm"
                  onClick={() => {
                    setEditing(t)
                    document.getElementById('tag-form')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  Editar
                </button>
                <button type="button" className="text-dim hover:text-danger px-1 py-2 text-sm" onClick={() => remove(t)}>
                  Borrar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
