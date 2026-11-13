'use client'

import { verticalListSortingStrategy } from '@dnd-kit/sortable'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { reorderProjects, updateProject } from '@/app/actions'
import type { Project } from '@/lib/types'
import { Grip, SortableItem, SortableList } from './Sortable'
import { TagIcon, Toggle } from './ui'

type Filter = 'ALL' | 'PUBLISHED' | 'DRAFT'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'ALL', label: 'Todos' },
  { id: 'PUBLISHED', label: 'Publicados' },
  { id: 'DRAFT', label: 'Borradores' },
]

export default function ProjectList({ initial }: { initial: Project[] }) {
  const [projects, setProjects] = useState(initial)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const q = query.trim().toLowerCase()
  const filtering = q !== '' || filter !== 'ALL'
  const visible = projects.filter(
    (p) =>
      (filter === 'ALL' || p.status === filter) &&
      (!q || p.title.toLowerCase().includes(q) || p.tags.some((t) => t.name.toLowerCase().includes(q))),
  )

  const reorder = (next: Project[]) => {
    const before = projects
    setProjects(next)
    setError(null)
    startTransition(async () => {
      const res = await reorderProjects(next.map((p) => p.id))
      if (!res.ok) {
        setProjects(before)
        setError(`No se guardó el orden. ${res.error}`)
      }
    })
  }

  const toggle = (project: Project) => {
    const status = project.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
    const apply = (s: Project['status']) =>
      setProjects((list) => list.map((p) => (p.id === project.id ? { ...p, status: s } : p)))
    apply(status)
    setError(null)
    startTransition(async () => {
      const res = await updateProject(project.id, { status })
      if (!res.ok) {
        apply(project.status)
        setError(`No se cambió “${project.title}”. ${res.error}`)
      }
    })
  }

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <input
          className="field max-w-xs !rounded-full !py-2"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por título o etiqueta"
          aria-label="Buscar proyectos"
        />
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                filter === f.id ? 'bg-surface text-ink' : 'text-dim hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-dim mt-3 text-sm">
        {filtering
          ? `${visible.length} de ${projects.length}. Quita el filtro para cambiar el orden.`
          : 'Arrastra para cambiar el orden en el sitio.'}
      </p>
      {error && (
        <p role="alert" className="text-danger mt-4 text-sm">
          {error}
        </p>
      )}
      {visible.length === 0 && <p className="text-dim mt-10 text-center">Ningún proyecto coincide con la búsqueda.</p>}

      <SortableList items={visible} strategy={verticalListSortingStrategy} onReorder={filtering ? () => {} : reorder}>
        <ul className="mt-4 space-y-3">
          {visible.map((p) => {
            const published = p.status === 'PUBLISHED'
            const still = p.cover ? (p.cover.type === 'IMAGE' ? p.cover.url : p.cover.posterUrl) : null
            return (
              <SortableItem key={p.id} id={p.id}>
                {(handle, dragging) => (
                  <div
                    className={`bg-surface flex items-center gap-3 rounded-2xl border p-2.5 pr-4 transition-shadow sm:gap-4 ${
                      dragging ? 'border-accent shadow-2xl' : 'border-line'
                    }`}
                  >
                    <button
                      type="button"
                      ref={handle.ref}
                      {...handle.props}
                      disabled={filtering}
                      className="text-dim hover:text-ink touch-none self-stretch px-2 disabled:opacity-25"
                      style={{ cursor: filtering ? 'default' : dragging ? 'grabbing' : 'grab' }}
                      aria-label={`Mover ${p.title}`}
                    >
                      <Grip />
                    </button>
                    <Link href={`/projects/${p.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                      <span className="bg-raised border-line block aspect-[16/10] w-20 shrink-0 overflow-hidden rounded-lg border sm:w-28">
                        {still && <img src={still} alt="" className="h-full w-full object-cover" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{p.title}</span>
                        <span className="text-dim mt-1 block truncate text-sm">{p.summary || 'Sin resumen'}</span>
                        <span className="text-dim mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          {p.tags.slice(0, 4).map((t) => (
                            <span key={t.id} className="flex items-center gap-1.5">
                              <TagIcon tag={t} size={12} />
                              {t.name}
                            </span>
                          ))}
                          {!p.url && <span className="pixel">Privado</span>}
                        </span>
                      </span>
                    </Link>
                    <Toggle on={published} onChange={() => toggle(p)} label={`Publicar ${p.title}`} showLabel={false} />
                  </div>
                )}
              </SortableItem>
            )
          })}
        </ul>
      </SortableList>
    </>
  )
}
