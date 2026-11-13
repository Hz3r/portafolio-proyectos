'use client'

import { useMemo, useRef, useState } from 'react'
import { createTag, deleteTag, presignUpload, updateTag } from '@/app/actions'
import { PRESETS, type Preset } from '@/lib/presets'
import type { Tag } from '@/lib/types'
import { uploadFile } from '@/lib/upload'
import { TagIcon } from './ui'

type Draft = { id: string | null; name: string; iconPath: string | null; color: string | null; file: File | null; iconUrl: string | null }
const EMPTY: Draft = { id: null, name: '', iconPath: null, color: null, file: null, iconUrl: null }
const ICON_TYPES = 'image/svg+xml,image/png,image/webp,image/jpeg'

export default function TagManager({ initial }: { initial: Tag[] }) {
  const [tags, setTags] = useState(initial)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const form = useRef<HTMLFormElement>(null)

  const names = useMemo(() => new Set(tags.map((t) => t.name.toLowerCase())), [tags])
  const q = search.trim().toLowerCase()
  const presets = PRESETS.filter((p) => !q || p.name.toLowerCase().includes(q))
  const preview = draft.file ? URL.createObjectURL(draft.file) : draft.iconUrl
  const sorted = (list: Tag[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'))

  /** Un clic en una prediseñada la crea tal cual. */
  const addPreset = async (p: Preset) => {
    setError(null)
    setBusy(true)
    const res = await createTag({ name: p.name, iconPath: p.iconPath, color: p.color })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setTags((list) => sorted([...list, res.data]))
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      let iconKey: string | null | undefined
      if (draft.file) {
        const presign = await presignUpload({ filename: draft.file.name, contentType: draft.file.type, size: draft.file.size })
        if (!presign.ok) return setError(presign.error)
        await uploadFile(presign.data, draft.file, () => {})
        iconKey = presign.data.key
      } else if (!draft.iconUrl) {
        iconKey = null
      }
      const input = {
        name: draft.name,
        iconPath: draft.file || draft.iconUrl ? null : draft.iconPath,
        color: draft.file || draft.iconUrl ? null : draft.color,
        ...(iconKey !== undefined ? { iconKey } : {}),
      }
      const res = draft.id ? await updateTag(draft.id, input) : await createTag(input)
      if (!res.ok) return setError(res.error)
      setTags((list) => sorted([...list.filter((t) => t.id !== res.data.id), res.data]))
      setDraft(EMPTY)
    } catch {
      setError('No se pudo subir el icono. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  const edit = (t: Tag) => {
    setError(null)
    setDraft({ id: t.id, name: t.name, iconPath: t.iconPath, color: t.color, file: null, iconUrl: t.iconUrl })
    form.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const remove = async (t: Tag) => {
    const used = t.projectCount ? ` Se quitará de ${t.projectCount} ${t.projectCount === 1 ? 'proyecto' : 'proyectos'}.` : ''
    if (!confirm(`¿Borrar la etiqueta “${t.name}”?${used}`)) return
    const res = await deleteTag(t.id)
    if (!res.ok) return setError(res.error)
    setTags((list) => list.filter((x) => x.id !== t.id))
    if (draft.id === t.id) setDraft(EMPTY)
  }

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
      <section aria-labelledby="mine">
        <h2 id="mine" className="text-lg font-semibold">
          Tus etiquetas <span className="pixel text-accent ml-1">{tags.length}</span>
        </h2>
        {tags.length === 0 ? (
          <p className="border-line text-dim mt-4 rounded-2xl border border-dashed px-5 py-10 text-center">
            Aún no tienes etiquetas. Elige una prediseñada o crea la tuya.
          </p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {tags.map((t) => (
              <li key={t.id} className={`bg-surface flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${draft.id === t.id ? 'border-accent' : 'border-line'}`}>
                <span className="bg-raised flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <TagIcon tag={t} size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{t.name}</span>
                  <span className="text-dim text-xs">
                    {t.projectCount ? `${t.projectCount} ${t.projectCount === 1 ? 'proyecto' : 'proyectos'}` : 'Sin usar'}
                  </span>
                </span>
                <button type="button" className="text-dim hover:text-ink px-1 py-2 text-sm" onClick={() => edit(t)}>
                  Editar
                </button>
                <button type="button" className="text-dim hover:text-danger px-1 py-2 text-sm" onClick={() => remove(t)}>
                  Borrar
                </button>
              </li>
            ))}
          </ul>
        )}

        <h2 className="mt-12 text-lg font-semibold">Prediseñadas</h2>
        <p className="text-dim mt-1 text-sm">Un clic la añade con su icono. Las que ya tienes aparecen marcadas.</p>
        <input
          className="field mt-4 max-w-xs !rounded-full !py-2"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar: React, Web, Python…"
          aria-label="Buscar etiquetas prediseñadas"
        />
        {(['Tipo', 'Tecnología'] as const).map((group) => {
          const items = presets.filter((p) => p.group === group)
          if (!items.length) return null
          return (
            <div key={group} className="mt-5">
              <h3 className="pixel text-dim">{group}</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {items.map((p) => {
                  const added = names.has(p.name.toLowerCase())
                  return (
                    <li key={p.name}>
                      <button
                        type="button"
                        disabled={added || busy}
                        onClick={() => addPreset(p)}
                        className={`inline-flex items-center gap-2 rounded-full border py-1.5 pr-3 pl-2.5 text-sm transition-colors ${
                          added ? 'border-accent/40 text-dim' : 'border-line hover:border-dim'
                        }`}
                      >
                        <TagIcon tag={{ iconPath: p.iconPath, iconUrl: null, color: p.color }} />
                        {p.name}
                        {added && <span className="text-accent" aria-label="ya añadida">✓</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
        {presets.length === 0 && <p className="text-dim mt-5 text-sm">Ninguna coincide. Créala a medida con el formulario.</p>}
      </section>

      <form ref={form} onSubmit={save} className="bg-surface border-line h-fit rounded-2xl border p-5 lg:sticky lg:top-6">
        <h2 className="text-lg font-semibold">{draft.id ? 'Editar etiqueta' : 'Etiqueta a medida'}</h2>
        <div className="mt-5">
          <label className="label" htmlFor="tag-name">
            Nombre
          </label>
          <input
            id="tag-name"
            className="field !bg-bg"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            maxLength={30}
            required
            placeholder="Mi framework"
          />
        </div>

        <div className="mt-5">
          <p className="label">Icono</p>
          <div className="flex items-center gap-3">
            <span className="bg-bg border-line flex size-12 shrink-0 items-center justify-center rounded-xl border">
              {preview || draft.iconPath ? (
                <TagIcon tag={{ iconPath: draft.iconPath, iconUrl: preview, color: draft.color }} size={24} />
              ) : (
                <span className="text-dim text-xs">Sin</span>
              )}
            </span>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn !py-1.5 text-sm" onClick={() => fileInput.current?.click()}>
                Subir imagen
              </button>
              {(preview || draft.iconPath) && (
                <button
                  type="button"
                  className="btn text-dim !py-1.5 text-sm"
                  onClick={() => setDraft({ ...draft, iconPath: null, color: null, file: null, iconUrl: null })}
                >
                  Quitar
                </button>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept={ICON_TYPES}
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                if (file.size > 1024 * 1024) return setError('El icono supera 1 MB. Usa una imagen más ligera.')
                setError(null)
                setDraft({ ...draft, file, iconPath: null, color: null, iconUrl: null })
              }}
            />
          </div>
          <p className="hint">SVG o PNG cuadrado, hasta 1 MB. O elige uno de la lista:</p>
          <ul className="border-line bg-bg mt-3 grid max-h-44 grid-cols-7 gap-1 overflow-y-auto rounded-xl border p-2">
            {PRESETS.map((p) => {
              const active = !draft.file && !draft.iconUrl && draft.iconPath === p.iconPath
              return (
                <li key={p.name}>
                  <button
                    type="button"
                    title={p.name}
                    aria-label={`Icono de ${p.name}`}
                    aria-pressed={active}
                    onClick={() => setDraft({ ...draft, iconPath: p.iconPath, color: p.color, file: null, iconUrl: null })}
                    className={`flex aspect-square w-full items-center justify-center rounded-lg ${active ? 'bg-accent/15 ring-accent ring-1' : 'hover:bg-surface'}`}
                  >
                    <TagIcon tag={{ iconPath: p.iconPath, iconUrl: null, color: p.color }} size={18} />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {error && (
          <p role="alert" className="text-danger mt-4 text-sm">
            {error}
          </p>
        )}
        <div className="mt-6 flex gap-2">
          <button className="btn btn-primary" disabled={busy || !draft.name.trim()}>
            {busy ? 'Guardando…' : draft.id ? 'Guardar etiqueta' : 'Crear etiqueta'}
          </button>
          {draft.id && (
            <button type="button" className="btn" onClick={() => setDraft(EMPTY)}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
