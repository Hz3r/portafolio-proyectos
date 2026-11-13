'use client'

import DOMPurify from 'dompurify'
import { marked } from 'marked'
import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { deleteProject, updateProject } from '@/app/actions'
import type { IconHit } from '@/lib/icons'
import type { Person, Project, Section, Tag } from '@/lib/types'
import MediaManager from './MediaManager'
import StoryEditor from './StoryEditor'
import TagForm from './TagForm'
import { Tabs, TagIcon, Toggle } from './ui'

type Form = {
  title: string
  slug: string
  summary: string
  description: string
  url: string
  repoUrl: string
  year: string
  status: Project['status']
  tagIds: string[]
  sections: Section[]
  myRole: Project['myRole']
  myRoleNote: string
  people: Person[]
}

type Tab = 'general' | 'historia' | 'archivos'

const toForm = (p: Project): Form => ({
  title: p.title,
  slug: p.slug,
  summary: p.summary,
  description: p.description,
  url: p.url ?? '',
  repoUrl: p.repoUrl ?? '',
  year: p.year ? String(p.year) : '',
  status: p.status,
  tagIds: p.tags.map((t) => t.id),
  myRole: p.myRole,
  myRoleNote: p.myRoleNote,
  people: p.people,
  // La API añade `media` resuelto a las galerías; aquí solo interesan los ids.
  sections: p.sections.map((s) => (s.type === 'MEDIA' ? { id: s.id, type: s.type, title: s.title, mediaIds: s.mediaIds, caption: s.caption } : s)),
})

const slugify = (title: string) =>
  title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

export default function ProjectEditor({
  project,
  allTags: initialTags,
  siteUrl,
  featured,
  iconTotal,
}: {
  project: Project
  allTags: Tag[]
  siteUrl: string | null
  featured: IconHit[]
  iconTotal: number
}) {
  const [allTags, setAllTags] = useState(initialTags)
  const [tagQuery, setTagQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [saved, setSaved] = useState(() => toForm(project))
  const [form, setForm] = useState(saved)
  const [media, setMedia] = useState(project.media)
  const [coverId, setCoverId] = useState(project.cover?.id ?? null)
  const [tab, setTab] = useState<Tab>('general')
  const [preview, setPreview] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  const published = form.status === 'PUBLISHED'
  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setMessage(null)
  }

  // Avisa antes de cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const html = useMemo(
    () => (preview ? DOMPurify.sanitize(marked.parse(form.description, { async: false, breaks: true })) : ''),
    [preview, form.description],
  )

  const selected = form.tagIds.flatMap((id) => allTags.find((t) => t.id === id) ?? [])
  const tq = tagQuery.trim().toLowerCase()
  const available = allTags.filter((t) => !form.tagIds.includes(t.id) && (!tq || t.name.toLowerCase().includes(tq)))
  const exact = allTags.some((t) => t.name.toLowerCase() === tq)

  const save = () => {
    const fail = (text: string, where: Tab = 'general') => {
      setTab(where)
      setMessage({ kind: 'error', text })
    }
    if (!form.title.trim()) return fail('El título es obligatorio.')
    const year = form.year.trim() ? Number(form.year) : null
    if (year !== null && (!Number.isInteger(year) || year < 1970 || year > 2100)) {
      return fail('El año debe ser un número entre 1970 y 2100.')
    }
    startTransition(async () => {
      const res = await updateProject(project.id, {
        title: form.title,
        slug: form.slug,
        summary: form.summary,
        description: form.description,
        url: form.url.trim() || null,
        repoUrl: form.repoUrl.trim() || null,
        status: form.status,
        year,
        tagIds: form.tagIds,
        sections: form.sections,
        myRole: form.myRole,
        myRoleNote: form.myRoleNote,
        people: form.people.filter((person) => person.name.trim()),
      })
      if (!res.ok) return setMessage({ kind: 'error', text: res.error })
      const next = toForm(res.data)
      setSaved(next)
      setForm(next)
      setMessage({ kind: 'ok', text: 'Cambios guardados' })
    })
  }

  const remove = () => {
    if (!confirm(`¿Borrar “${saved.title}” con todas sus imágenes y videos? No se puede deshacer.`)) return
    startTransition(async () => {
      const res = await deleteProject(project.id)
      if (res && !res.ok) setMessage({ kind: 'error', text: res.error })
    })
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="min-w-0 truncate text-3xl font-semibold tracking-tight">{form.title || 'Sin título'}</h1>
        <Toggle on={published} onChange={() => set('status', published ? 'DRAFT' : 'PUBLISHED')} label="Publicar proyecto" />
      </div>

      <div className="mt-6">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'general', label: 'General' },
            { id: 'historia', label: 'Historia', count: form.sections.length },
            { id: 'archivos', label: 'Archivos', count: media.length },
          ]}
        />
      </div>

      <div className="pt-8" hidden={tab !== 'general'}>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="title">
              Título
            </label>
            <input
              id="title"
              className="field"
              value={form.title}
              onChange={(e) => {
                set('title', e.target.value)
                // Un proyecto recién creado toma su dirección del título.
                if (saved.slug.startsWith('proyecto-sin-titulo')) set('slug', slugify(e.target.value))
              }}
              maxLength={140}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="summary">
              Resumen
            </label>
            <input
              id="summary"
              className="field"
              value={form.summary}
              onChange={(e) => set('summary', e.target.value)}
              maxLength={200}
              placeholder="Una línea que explique qué es"
            />
            <p className="hint">Aparece en la tarjeta de la portada. {form.summary.length}/200</p>
          </div>

          <div className="sm:col-span-2">
            <div className="mb-[0.45rem] flex items-center justify-between">
              <label className="text-sm font-medium" htmlFor="description">
                Introducción
              </label>
              <button type="button" className="text-dim hover:text-ink text-sm" onClick={() => setPreview((v) => !v)}>
                {preview ? 'Editar' : 'Vista previa'}
              </button>
            </div>
            {preview ? (
              <div
                className="field preview min-h-36"
                dangerouslySetInnerHTML={{ __html: html || '<p style="opacity:.5">Nada que mostrar todavía.</p>' }}
              />
            ) : (
              <textarea
                id="description"
                className="field min-h-36 leading-relaxed"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                maxLength={20000}
                placeholder="Un par de párrafos que abran el proyecto. El detalle va en la pestaña Historia."
              />
            )}
            <p className="hint">Se muestra antes de los capítulos. Admite Markdown.</p>
          </div>

          <div>
            <label className="label" htmlFor="url">
              Enlace del proyecto
            </label>
            <input id="url" className="field" type="url" inputMode="url" value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://" />
            <p className="hint">
              {form.url.trim() ? 'El sitio mostrará un botón para visitarlo.' : 'Sin enlace, se muestra con la etiqueta “Privado”.'}
            </p>
          </div>

          <div>
            <label className="label" htmlFor="repo">
              Repositorio
            </label>
            <input id="repo" className="field" type="url" inputMode="url" value={form.repoUrl} onChange={(e) => set('repoUrl', e.target.value)} placeholder="https://github.com/usuario/repo" />
            <p className="hint">Opcional. Añade un botón directo al código.</p>
          </div>

          <div className="sm:col-span-2">
            <div className="mb-[0.45rem] flex items-center justify-between">
              <p className="text-sm font-medium">Etiquetas</p>
              <Link href="/tags" className="text-dim hover:text-ink text-sm">
                Administrar etiquetas
              </Link>
            </div>
            <div className="field !p-3">
              {selected.length > 0 && (
                <ul className="mb-3 flex flex-wrap gap-2">
                  {selected.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => set('tagIds', form.tagIds.filter((id) => id !== t.id))}
                        className="border-accent/50 bg-accent/10 inline-flex items-center gap-2 rounded-full border py-1.5 pr-2.5 pl-2.5 text-sm"
                        aria-label={`Quitar ${t.name}`}
                      >
                        <TagIcon tag={t} />
                        {t.name}
                        <span className="text-dim" aria-hidden="true">
                          ×
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <input
                className="field !bg-bg mb-3 !rounded-full !py-2"
                type="search"
                value={tagQuery}
                onChange={(e) => (setTagQuery(e.target.value), setCreating(false))}
                placeholder="Buscar o crear etiqueta"
                aria-label="Buscar o crear etiqueta"
              />
              {available.length > 0 && (
                <ul className="flex max-h-44 flex-wrap gap-2 overflow-y-auto">
                  {available.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        disabled={form.tagIds.length >= 12}
                        onClick={() => set('tagIds', [...form.tagIds, t.id])}
                        className="border-line text-dim hover:border-dim hover:text-ink inline-flex items-center gap-2 rounded-full border py-1.5 pr-3 pl-2.5 text-sm transition-colors"
                      >
                        <TagIcon tag={t} />
                        {t.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {available.length === 0 && !tq && (
                <p className="text-dim text-sm">
                  {allTags.length === 0 ? 'Aún no tienes etiquetas. Escribe un nombre para crear la primera.' : 'Ya usaste todas tus etiquetas.'}
                </p>
              )}
              {tq && !exact && !creating && (
                <button type="button" className="btn mt-3 !py-1.5 text-sm" onClick={() => setCreating(true)}>
                  Crear “{tagQuery.trim()}”
                </button>
              )}
              {creating && (
                <div className="border-line bg-surface mt-3 rounded-xl border p-4">
                  <TagForm
                    key={tagQuery}
                    initialName={tagQuery.trim()}
                    featured={featured}
                    total={iconTotal}
                    onCancel={() => setCreating(false)}
                    onSaved={(tag) => {
                      setAllTags((list) => [...list, tag].sort((a, b) => a.name.localeCompare(b.name, 'es')))
                      if (form.tagIds.length < 12) set('tagIds', [...form.tagIds, tag.id])
                      setCreating(false)
                      setTagQuery('')
                    }}
                  />
                </div>
              )}
            </div>
            <p className="hint">Toca para añadir o quitar. La primera es la más visible en la tarjeta.</p>
          </div>

          <div>
            <label className="label" htmlFor="year">
              Año
            </label>
            <input
              id="year"
              className="field"
              inputMode="numeric"
              value={form.year}
              onChange={(e) => set('year', e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="2026"
            />
          </div>

          <div>
            <label className="label" htmlFor="slug">
              Dirección en el sitio
            </label>
            <div className="field focus-within:border-accent flex items-center gap-1">
              <span className="text-dim shrink-0">/p/</span>
              <input
                id="slug"
                className="min-w-0 flex-1 bg-transparent outline-none"
                value={form.slug}
                onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                maxLength={80}
              />
            </div>
            <p className="hint">Cambiarla rompe los enlaces ya compartidos.</p>
          </div>
        </div>

        <fieldset className="border-line mt-10 border-t pt-8">
          <legend className="sr-only">Créditos</legend>
          <h2 className="text-lg font-semibold">Créditos</h2>
          <p className="text-dim mt-1 text-sm">
            Tú apareces siempre, enlazado al GitHub que pusiste en Ajustes. Añade aquí a las demás personas.
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {(
              [
                ['AUTHOR', 'Es mi proyecto', 'Lo creé yo; las demás personas son colaboradoras.'],
                ['COLLABORATOR', 'Soy colaborador', 'El proyecto es de otra persona o equipo y yo participé.'],
              ] as const
            ).map(([value, label, hint]) => (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  form.myRole === value ? 'border-accent bg-accent/5' : 'border-line hover:border-dim'
                }`}
              >
                <input type="radio" name="myRole" className="accent-accent mt-1" checked={form.myRole === value} onChange={() => set('myRole', value)} />
                <span>
                  <span className="block font-medium">{label}</span>
                  <span className="text-dim block text-sm">{hint}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="mt-5">
            <label className="label" htmlFor="role-note">
              Tu papel
            </label>
            <input
              id="role-note"
              className="field"
              value={form.myRoleNote}
              onChange={(e) => set('myRoleNote', e.target.value)}
              maxLength={120}
              placeholder={form.myRole === 'AUTHOR' ? 'Diseño y desarrollo completo' : 'Backend y base de datos'}
            />
          </div>

          <p className="label mt-6">{form.myRole === 'AUTHOR' ? 'Colaboradores' : 'Equipo del proyecto'}</p>
          <ul className="space-y-2">
            {form.people.map((person, i) => {
              const patch = (next: Partial<Person>) => set('people', form.people.map((x, j) => (j === i ? { ...x, ...next } : x)))
              return (
                <li key={i} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_1fr_auto] sm:items-center">
                  <input className="field" value={person.name} onChange={(e) => patch({ name: e.target.value })} maxLength={60} placeholder="Nombre o @usuario" aria-label="Nombre" />
                  <input className="field" value={person.url} onChange={(e) => patch({ url: e.target.value })} inputMode="url" placeholder="https://github.com/usuario" aria-label="Enlace" />
                  <input className="field" value={person.role} onChange={(e) => patch({ role: e.target.value })} maxLength={60} placeholder={form.myRole === 'AUTHOR' ? 'Diseño, QA…' : 'Autor, líder…'} aria-label="Papel" />
                  <button type="button" className="text-dim hover:text-danger justify-self-start px-1 py-1 text-sm" onClick={() => set('people', form.people.filter((_, j) => j !== i))}>
                    Quitar
                  </button>
                </li>
              )
            })}
          </ul>
          <button
            type="button"
            className="btn mt-3 !py-1.5 text-sm"
            disabled={form.people.length >= 12}
            onClick={() => set('people', [...form.people, { name: '', url: '', role: '' }])}
          >
            Añadir persona
          </button>
        </fieldset>

        <div className="border-line mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5">
          <div>
            <p className="font-medium">Borrar proyecto</p>
            <p className="text-dim mt-1 text-sm">Elimina el proyecto con sus imágenes y videos. No se puede deshacer.</p>
          </div>
          <button type="button" className="btn btn-danger" onClick={remove} disabled={pending}>
            Borrar proyecto
          </button>
        </div>
      </div>

      <div className="pt-8" hidden={tab !== 'historia'}>
        <StoryEditor sections={form.sections} onChange={(sections) => set('sections', sections)} media={media} />
      </div>

      <div className="pt-8" hidden={tab !== 'archivos'}>
        <MediaManager projectId={project.id} media={media} setMedia={setMedia} coverId={coverId} setCoverId={setCoverId} />
      </div>

      <div className="bg-bg/90 border-line sticky bottom-0 z-20 -mx-5 mt-10 flex flex-wrap items-center gap-3 border-t px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <button type="button" className="btn btn-primary" onClick={save} disabled={pending || !dirty}>
          {pending ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {siteUrl && saved.status === 'PUBLISHED' && (
          <a className="btn" href={`${siteUrl.replace(/\/$/, '')}/p/${saved.slug}`} target="_blank" rel="noopener noreferrer">
            Ver en el sitio
          </a>
        )}
        <p role="status" className={`min-w-0 flex-1 text-sm empty:hidden max-sm:order-first max-sm:basis-full ${message?.kind === 'error' ? 'text-danger' : 'text-dim'}`}>
          {message?.text ?? (dirty ? 'Hay cambios sin guardar' : '')}
        </p>
      </div>
    </div>
  )
}
