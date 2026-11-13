'use client'

import { verticalListSortingStrategy } from '@dnd-kit/sortable'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { reorderProjects, updateProject } from '@/app/actions'
import type { Project } from '@/lib/types'
import { Grip, SortableItem, SortableList } from './Sortable'

export default function ProjectList({ initial }: { initial: Project[] }) {
  const [projects, setProjects] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

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
      {error && (
        <p role="alert" className="text-danger mt-6 text-sm">
          {error}
        </p>
      )}
      <SortableList items={projects} strategy={verticalListSortingStrategy} onReorder={reorder}>
        <ul className="mt-8 space-y-3">
          {projects.map((p) => {
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
                      className="text-dim hover:text-ink touch-none self-stretch px-2"
                      style={{ cursor: dragging ? 'grabbing' : 'grab' }}
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
                        <span className="text-dim mt-1 block truncate text-sm">
                          {p.summary || 'Sin resumen'}
                        </span>
                        {!p.url && <span className="pixel text-dim mt-2 block">Privado, sin enlace</span>}
                      </span>
                    </Link>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={published}
                      aria-label={`Publicar ${p.title}`}
                      onClick={() => toggle(p)}
                      className="flex shrink-0 items-center gap-2.5 py-2"
                    >
                      <span className={`pixel hidden sm:block ${published ? 'text-accent' : 'text-dim'}`}>
                        {published ? 'Publicado' : 'Borrador'}
                      </span>
                      <span
                        className={`relative h-6 w-10 rounded-full transition-colors ${published ? 'bg-accent' : 'bg-line'}`}
                      >
                        <span
                          className={`bg-bg absolute top-1 left-1 size-4 rounded-full transition-transform ${
                            published ? 'translate-x-4' : ''
                          }`}
                        />
                      </span>
                    </button>
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
