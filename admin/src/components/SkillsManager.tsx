'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createTag, searchIcons, updateTag } from '@/app/actions'
import type { Tag } from '@/lib/types'
import { TagIcon } from './ui'

const LEVELS = [
  { value: 1, label: 'Aprendiendo', hint: 'La estoy aprendiendo: órbita exterior' },
  { value: 2, label: 'Soltura', hint: 'La uso con soltura: órbita media' },
  { value: 3, label: 'Domino', hint: 'La domino: órbita interior' },
]
const SUGGESTED = ['Frontend', 'Backend', 'Bases de datos', 'Herramientas', 'Diseño', 'IA']
const sorted = (list: Tag[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'))

/** Habilidades por grupos. Una habilidad es una etiqueta marcada como tal. */
export default function SkillsManager({ initial, siteUrl }: { initial: Tag[]; siteUrl: string | null }) {
  const [tags, setTags] = useState(initial)
  // Grupos creados aquí que todavía no tienen ninguna habilidad.
  const [empty, setEmpty] = useState<string[]>([])
  const [newGroup, setNewGroup] = useState('')
  const [error, setError] = useState<string | null>(null)

  const skills = tags.filter((t) => t.skill)
  const names = [...new Set([...skills.map((t) => t.skillGroup ?? ''), ...empty])].sort((a, b) =>
    a === '' ? 1 : b === '' ? -1 : a.localeCompare(b, 'es'),
  )
  const replace = (tag: Tag) => setTags((list) => sorted([...list.filter((t) => t.id !== tag.id), { ...list.find((t) => t.id === tag.id), ...tag }]))

  const save = async (tag: Tag, input: { skill?: boolean; skillGroup?: string; skillLevel?: number }) => {
    setError(null)
    const res = await updateTag(tag.id, input)
    if (!res.ok) return setError(res.error)
    replace(res.data)
  }

  const addGroup = (name: string) => {
    const group = name.trim()
    if (!group || names.includes(group)) return
    setEmpty((list) => [...list, group])
    setNewGroup('')
  }

  const rename = async (from: string, to: string) => {
    const group = to.trim()
    if (!group || group === from) return
    setError(null)
    setEmpty((list) => list.map((g) => (g === from ? group : g)))
    for (const tag of skills.filter((t) => (t.skillGroup ?? '') === from)) {
      const res = await updateTag(tag.id, { skillGroup: group })
      if (!res.ok) return setError(res.error)
      replace(res.data)
    }
  }

  const unused = SUGGESTED.filter((g) => !names.includes(g))

  return (
    <div className="mt-8">
      {error && (
        <p role="alert" className="text-danger mb-4 text-sm">
          {error}
        </p>
      )}

      {names.length === 0 && (
        <div className="border-line rounded-2xl border border-dashed px-6 py-10 text-center">
          <p className="font-medium">Aún no has añadido habilidades</p>
          <p className="text-dim mx-auto mt-1.5 max-w-md text-sm">
            Crea un grupo (por ejemplo Frontend) y añade dentro las tecnologías que usas. La sección aparece en el portafolio en
            cuanto haya una.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {names.map((group) => (
          <Group
            key={group}
            name={group}
            skills={skills.filter((t) => (t.skillGroup ?? '') === group)}
            candidates={tags.filter((t) => !t.skill)}
            onAdd={(tag) => save(tag, { skill: true, skillGroup: group })}
            onRemove={(tag) => save(tag, { skill: false, skillGroup: '' })}
            onLevel={(tag, skillLevel) => save(tag, { skillLevel })}
            onRename={(to) => rename(group, to)}
            onCreate={async (name) => {
              setError(null)
              // Si la librería tiene un icono con ese mismo nombre, se usa.
              const hit = (await searchIcons(name).catch(() => [])).find((h) => h.name.toLowerCase() === name.toLowerCase())
              const res = await createTag({ name, skill: true, skillGroup: group, iconPath: hit?.iconPath ?? null, color: hit?.color ?? null })
              if (!res.ok) return setError(res.error)
              setTags((list) => sorted([...list, res.data]))
            }}
          />
        ))}
      </div>

      <form
        onSubmit={(e) => (e.preventDefault(), addGroup(newGroup))}
        className="border-line mt-6 rounded-2xl border p-5"
      >
        <label className="label" htmlFor="new-group">
          Nuevo grupo
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="new-group"
            className="field max-w-xs"
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            maxLength={40}
            placeholder="Nombre del grupo"
          />
          <button className="btn" disabled={!newGroup.trim()}>
            Crear grupo
          </button>
        </div>
        {unused.length > 0 && (
          <p className="text-dim mt-3 flex flex-wrap items-center gap-2 text-sm">
            O empieza con uno:
            {unused.map((g) => (
              <button key={g} type="button" className="border-line hover:border-dim hover:text-ink rounded-full border px-3 py-1.5" onClick={() => addGroup(g)}>
                {g}
              </button>
            ))}
          </p>
        )}
      </form>

      <p className="text-dim mt-6 text-sm">
        El icono de cada habilidad se cambia en <Link href="/tags" className="text-ink underline underline-offset-2">Etiquetas</Link>.
        {siteUrl && (
          <>
            {' '}
            Los cambios se ven en{' '}
            <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-2">
              el sitio
            </a>{' '}
            en menos de un minuto.
          </>
        )}
      </p>
    </div>
  )
}

function Group({
  name,
  skills,
  candidates,
  onAdd,
  onRemove,
  onLevel,
  onRename,
  onCreate,
}: {
  name: string
  skills: Tag[]
  candidates: Tag[]
  onAdd: (tag: Tag) => void
  onRemove: (tag: Tag) => void
  onLevel: (tag: Tag, level: number) => void
  onRename: (to: string) => void
  onCreate: (name: string) => Promise<void>
}) {
  const [title, setTitle] = useState(name)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const q = query.trim().toLowerCase()
  // Las sugerencias aparecen al escribir, para no repetir la lista en cada grupo.
  const matches = q ? candidates.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 14) : []
  const exists = [...candidates, ...skills].some((t) => t.name.toLowerCase() === q)

  return (
    <section className="bg-surface border-line rounded-2xl border p-5">
      <div className="flex items-center justify-between gap-3">
        <input
          className="hover:border-line focus:border-accent -ml-2 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-semibold outline-none"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => (title.trim() ? onRename(title) : setTitle(name))}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          maxLength={40}
          placeholder="Sin grupo"
          aria-label="Nombre del grupo"
        />
        <span className="pixel text-accent shrink-0">{skills.length}</span>
      </div>

      {skills.length > 0 ? (
        <ul className="mt-4 space-y-1.5">
          {[...skills]
            .sort((a, b) => (b.skillLevel ?? 2) - (a.skillLevel ?? 2))
            .map((t) => {
              const level = t.skillLevel ?? 2
              return (
                <li key={t.id} className="bg-bg border-line flex items-center gap-3 rounded-xl border py-1.5 pr-1.5 pl-3">
                  <TagIcon tag={t} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.name}</span>
                  <span role="radiogroup" aria-label={`Nivel de ${t.name}`} className="border-line flex shrink-0 rounded-full border p-0.5">
                    {LEVELS.map((l) => (
                      <button
                        key={l.value}
                        type="button"
                        role="radio"
                        aria-checked={level === l.value}
                        title={l.hint}
                        onClick={() => level !== l.value && onLevel(t, l.value)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${level === l.value ? 'bg-accent text-bg' : 'text-dim hover:text-ink'}`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </span>
                  <button type="button" onClick={() => onRemove(t)} aria-label={`Quitar ${t.name} de las habilidades`} className="text-dim hover:text-danger shrink-0 px-2 py-1 text-lg leading-none">
                    ×
                  </button>
                </li>
              )
            })}
        </ul>
      ) : (
        <p className="text-dim mt-4 text-sm">Grupo vacío. Añade su primera habilidad.</p>
      )}

      <div className="border-line mt-5 border-t pt-4">
        <input
          className="field !bg-bg !rounded-full !py-2"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Añadir: busca una etiqueta o escribe una nueva"
          aria-label={`Añadir habilidad a ${name || 'este grupo'}`}
        />
        {matches.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {matches.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => (onAdd(t), setQuery(''))}
                  className="border-line text-dim hover:border-dim hover:text-ink inline-flex items-center gap-2 rounded-full border py-1.5 pr-3 pl-2.5 text-sm transition-colors"
                >
                  <TagIcon tag={t} />
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {q && !exists && (
          <button
            type="button"
            className="btn mt-3 !py-1.5 text-sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await onCreate(query.trim())
              setBusy(false)
              setQuery('')
            }}
          >
            {busy ? 'Creando…' : `Crear “${query.trim()}”`}
          </button>
        )}
      </div>
    </section>
  )
}
