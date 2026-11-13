'use client'

import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { useMemo, useState, useTransition } from 'react'
import { deleteProject, updateProject } from '@/app/actions'
import type { Project } from '@/lib/types'

type Form = {
  title: string
  slug: string
  summary: string
  description: string
  url: string
  year: string
  tags: string
  status: Project['status']
}

const toForm = (p: Project): Form => ({
  title: p.title,
  slug: p.slug,
  summary: p.summary,
  description: p.description,
  url: p.url ?? '',
  year: p.year ? String(p.year) : '',
  tags: p.tags.join(', '),
  status: p.status,
})

const slugify = (title: string) =>
  title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

export default function ProjectForm({ project, siteUrl }: { project: Project; siteUrl: string | null }) {
  const [saved, setSaved] = useState(() => toForm(project))
  const [form, setForm] = useState(saved)
  const [preview, setPreview] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  const published = form.status === 'PUBLISHED'
  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setMessage(null)
  }

  const html = useMemo(
    () => (preview ? DOMPurify.sanitize(marked.parse(form.description, { async: false, breaks: true })) : ''),
    [preview, form.description],
  )

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const year = form.year.trim() ? Number(form.year) : null
    if (year !== null && (!Number.isInteger(year) || year < 1970 || year > 2100)) {
      return setMessage({ kind: 'error', text: 'El año debe ser un número entre 1970 y 2100.' })
    }
    startTransition(async () => {
      const res = await updateProject(project.id, {
        title: form.title,
        slug: form.slug,
        summary: form.summary,
        description: form.description,
        url: form.url.trim() || null,
        status: form.status,
        year,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
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
    <form onSubmit={save} className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="min-w-0 truncate text-3xl font-semibold tracking-tight">{form.title || 'Sin título'}</h1>
        <button
          type="button"
          role="switch"
          aria-checked={published}
          onClick={() => set('status', published ? 'DRAFT' : 'PUBLISHED')}
          className="flex items-center gap-3 py-2"
        >
          <span className={`pixel ${published ? 'text-accent' : 'text-dim'}`}>
            {published ? 'Publicado' : 'Borrador'}
          </span>
          <span className={`relative h-6 w-10 rounded-full transition-colors ${published ? 'bg-accent' : 'bg-line'}`}>
            <span
              className={`bg-bg absolute top-1 left-1 size-4 rounded-full transition-transform ${published ? 'translate-x-4' : ''}`}
            />
          </span>
        </button>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
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
            required
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
              Descripción
            </label>
            <button type="button" className="text-dim hover:text-ink text-sm" onClick={() => setPreview((v) => !v)}>
              {preview ? 'Editar' : 'Vista previa'}
            </button>
          </div>
          {preview ? (
            <div
              className="field preview min-h-48"
              dangerouslySetInnerHTML={{ __html: html || '<p style="opacity:.5">Nada que mostrar todavía.</p>' }}
            />
          ) : (
            <textarea
              id="description"
              className="field min-h-48 leading-relaxed"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              maxLength={20000}
              placeholder="Cuenta el contexto: el reto, qué hiciste, el resultado."
            />
          )}
          <p className="hint">Admite Markdown: ## título, **negrita**, - listas, [texto](enlace).</p>
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="url">
            Enlace del proyecto
          </label>
          <input
            id="url"
            className="field"
            type="url"
            inputMode="url"
            value={form.url}
            onChange={(e) => set('url', e.target.value)}
            placeholder="https://"
          />
          <p className="hint">
            {form.url.trim()
              ? 'El sitio mostrará un botón para visitarlo.'
              : 'Sin enlace, el proyecto se muestra con la etiqueta “Privado”.'}
          </p>
        </div>

        <div>
          <label className="label" htmlFor="tags">
            Etiquetas
          </label>
          <input
            id="tags"
            className="field"
            value={form.tags}
            onChange={(e) => set('tags', e.target.value)}
            placeholder="Web, App, Diseño"
          />
          <p className="hint">Separadas por coma. Sirven de filtro en la portada.</p>
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

        <div className="sm:col-span-2">
          <label className="label" htmlFor="slug">
            Dirección en el sitio
          </label>
          <div className="field flex items-center gap-1 focus-within:border-accent">
            <span className="text-dim shrink-0">/p/</span>
            <input
              id="slug"
              className="min-w-0 flex-1 bg-transparent outline-none"
              value={form.slug}
              onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              maxLength={80}
            />
          </div>
          <p className="hint">Cambiarla rompe los enlaces que ya hayas compartido.</p>
        </div>
      </div>

      <div className="bg-bg/90 border-line sticky bottom-0 z-20 -mx-5 mt-8 flex flex-wrap items-center gap-3 border-t px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <button className="btn btn-primary" disabled={pending || !dirty}>
          {pending ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {siteUrl && saved.status === 'PUBLISHED' && (
          <a className="btn" href={`${siteUrl.replace(/\/$/, '')}/p/${saved.slug}`} target="_blank" rel="noopener noreferrer">
            Ver en el sitio
          </a>
        )}
        <p role="status" className={`min-w-0 flex-1 text-sm ${message?.kind === 'error' ? 'text-danger' : 'text-dim'}`}>
          {message?.text ?? (dirty ? 'Hay cambios sin guardar' : '')}
        </p>
        <button type="button" className="btn btn-danger" onClick={remove} disabled={pending}>
          Borrar proyecto
        </button>
      </div>
    </form>
  )
}
