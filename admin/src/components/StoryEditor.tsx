'use client'

import { verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useState } from 'react'
import type { Media, Section } from '@/lib/types'
import { Grip, SortableItem, SortableList } from './Sortable'

type Kind = Section['type']
const KINDS: { type: Kind; label: string; hint: string }[] = [
  { type: 'TEXT', label: 'Texto', hint: 'Contexto, el reto, cómo se hizo' },
  { type: 'MEDIA', label: 'Galería', hint: 'Imágenes y videos de un momento' },
  { type: 'METRICS', label: 'Métricas', hint: 'Ingresos, usuarios, resultados' },
  { type: 'FLOW', label: 'Flujo', hint: 'Cómo funciona, paso a paso' },
  { type: 'DOCS', label: 'Documentación', hint: 'Guías desplegables' },
]
const labelOf = (type: Kind) => KINDS.find((k) => k.type === type)!.label
const newId = () => crypto.randomUUID().slice(0, 8)

const blank = (type: Kind, title = ''): Section => {
  const base = { id: newId(), title }
  switch (type) {
    case 'TEXT':
      return { ...base, type, body: '' }
    case 'MEDIA':
      return { ...base, type, mediaIds: [], caption: '' }
    case 'METRICS':
      return { ...base, type, items: [{ label: '', value: '', note: '', highlight: false }] }
    case 'FLOW':
      return { ...base, type, steps: [{ title: '', text: '' }] }
    case 'DOCS':
      return { ...base, type, items: [{ title: '', body: '' }] }
  }
}

const TEMPLATE: [Kind, string][] = [
  ['TEXT', 'El reto'],
  ['FLOW', 'Cómo funciona'],
  ['MEDIA', 'El producto'],
  ['METRICS', 'Resultados'],
  ['TEXT', 'Cómo se hizo'],
  ['DOCS', 'Documentación'],
]

export default function StoryEditor({
  sections,
  onChange,
  media,
}: {
  sections: Section[]
  onChange: (sections: Section[]) => void
  media: Media[]
}) {
  const [closed, setClosed] = useState<Set<string>>(new Set())
  const patch = (id: string, next: Section) => onChange(sections.map((s) => (s.id === id ? next : s)))
  const toggle = (id: string) =>
    setClosed((set) => {
      const next = new Set(set)
      if (!next.delete(id)) next.add(id)
      return next
    })

  return (
    <div>
      <p className="text-dim max-w-2xl">
        Arma la historia con bloques. En el sitio cada bloque es un capítulo, en este orden, con un índice para saltar entre ellos.
      </p>

      {sections.length === 0 && (
        <div className="border-line mt-6 rounded-2xl border border-dashed px-6 py-10 text-center">
          <p className="font-medium">Empieza con una estructura sugerida</p>
          <p className="text-dim mx-auto mt-1.5 max-w-md text-sm">
            El reto, cómo funciona, el producto, resultados, cómo se hizo y documentación. Luego borra o reordena lo que no necesites.
          </p>
          <button type="button" className="btn btn-primary mt-5" onClick={() => onChange(TEMPLATE.map(([type, title]) => blank(type, title)))}>
            Usar estructura sugerida
          </button>
        </div>
      )}

      <SortableList items={sections} strategy={verticalListSortingStrategy} onReorder={onChange}>
        <ul className="mt-6 space-y-3">
          {sections.map((s, index) => {
            const open = !closed.has(s.id)
            return (
              <SortableItem key={s.id} id={s.id}>
                {(handle, dragging) => (
                  <div className={`bg-surface rounded-2xl border ${dragging ? 'border-accent shadow-2xl' : 'border-line'}`}>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 p-2.5 sm:flex-nowrap sm:gap-3">
                      <button
                        type="button"
                        ref={handle.ref}
                        {...handle.props}
                        className="text-dim hover:text-ink touch-none px-2 py-3"
                        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
                        aria-label={`Mover bloque ${index + 1}`}
                      >
                        <Grip />
                      </button>
                      <span className="pixel text-accent shrink-0 max-sm:order-first max-sm:basis-full max-sm:px-2 max-sm:pt-1.5 sm:w-32">{labelOf(s.type)}</span>
                      <input
                        className="field !bg-bg min-w-0 flex-1 !py-2 font-medium"
                        value={s.title}
                        onChange={(e) => patch(s.id, { ...s, title: e.target.value })}
                        maxLength={120}
                        placeholder="Título del capítulo"
                        aria-label="Título del capítulo"
                      />
                      <button type="button" className="text-dim hover:text-ink px-2 py-2 text-sm" onClick={() => toggle(s.id)} aria-expanded={open}>
                        {open ? 'Plegar' : 'Abrir'}
                      </button>
                      <button
                        type="button"
                        className="text-dim hover:text-danger px-2 py-2 text-sm"
                        onClick={() => confirm('¿Quitar este bloque?') && onChange(sections.filter((x) => x.id !== s.id))}
                      >
                        Quitar
                      </button>
                    </div>
                    {open && (
                      <div className="border-line border-t p-4">
                        <Body section={s} onChange={(next) => patch(s.id, next)} media={media} />
                      </div>
                    )}
                  </div>
                )}
              </SortableItem>
            )
          })}
        </ul>
      </SortableList>

      <div className="mt-6">
        <p className="label">Añadir bloque</p>
        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          {KINDS.map((k) => (
            <li key={k.type}>
              <button
                type="button"
                onClick={() => onChange([...sections, blank(k.type)])}
                className="border-line hover:border-accent h-full w-full rounded-xl border px-3.5 py-3 text-left transition-colors"
              >
                <span className="block font-medium">{k.label}</span>
                <span className="text-dim mt-1 block text-xs leading-snug">{k.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Body({ section: s, onChange, media }: { section: Section; onChange: (s: Section) => void; media: Media[] }) {
  if (s.type === 'TEXT') {
    return (
      <>
        <textarea
          className="field !bg-bg min-h-40 leading-relaxed"
          value={s.body}
          onChange={(e) => onChange({ ...s, body: e.target.value })}
          maxLength={20000}
          placeholder="Escribe este capítulo. Admite Markdown."
          aria-label="Texto"
        />
        <p className="hint">Markdown: ## subtítulo, **negrita**, - listas, [texto](enlace), `código`.</p>
      </>
    )
  }

  if (s.type === 'MEDIA') {
    if (media.length === 0) {
      return <p className="text-dim text-sm">Primero sube imágenes o videos en la pestaña Archivos; luego elígelos aquí.</p>
    }
    const pick = (id: string) =>
      onChange({ ...s, mediaIds: s.mediaIds.includes(id) ? s.mediaIds.filter((x) => x !== id) : [...s.mediaIds, id] })
    return (
      <>
        <p className="text-dim text-sm">Toca para elegir. Se muestran en el orden en que los marcas.</p>
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {media.map((m) => {
            const position = s.mediaIds.indexOf(m.id)
            const still = m.type === 'IMAGE' ? m.url : m.posterUrl
            return (
              <li key={m.id}>
                <button
                  type="button"
                  aria-pressed={position >= 0}
                  onClick={() => pick(m.id)}
                  className={`bg-raised relative block aspect-[16/10] w-full overflow-hidden rounded-lg border-2 ${
                    position >= 0 ? 'border-accent' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  {still ? (
                    <img src={still} alt={m.alt} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-dim flex h-full items-center justify-center text-xs">Video</span>
                  )}
                  {position >= 0 && (
                    <span className="pixel bg-accent text-bg absolute top-1 left-1 rounded px-1.5 py-1">{position + 1}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
        <input
          className="field !bg-bg mt-3"
          value={s.caption}
          onChange={(e) => onChange({ ...s, caption: e.target.value })}
          maxLength={300}
          placeholder="Pie de la galería (opcional)"
          aria-label="Pie de la galería"
        />
      </>
    )
  }

  if (s.type === 'METRICS') {
    const set = (i: number, patch: Partial<(typeof s.items)[number]>) =>
      onChange({ ...s, items: s.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) })
    return (
      <>
        <ul className="space-y-2">
          {s.items.map((it, i) => (
            <li key={i} className="grid gap-2 sm:grid-cols-[9rem_1fr_1.4fr_auto_auto] sm:items-center">
              <input className="field !bg-bg font-semibold" value={it.value} onChange={(e) => set(i, { value: e.target.value })} maxLength={40} placeholder="$4,200" aria-label="Valor" />
              <input className="field !bg-bg" value={it.label} onChange={(e) => set(i, { label: e.target.value })} maxLength={60} placeholder="Ingresos al mes" aria-label="Qué mide" />
              <input className="field !bg-bg" value={it.note} onChange={(e) => set(i, { note: e.target.value })} maxLength={140} placeholder="Detalle (opcional)" aria-label="Detalle" />
              <label className="text-dim flex items-center gap-2 text-sm">
                <input type="checkbox" className="accent-accent size-4" checked={it.highlight} onChange={(e) => set(i, { highlight: e.target.checked })} />
                Destacar
              </label>
              <RowRemove onClick={() => onChange({ ...s, items: s.items.filter((_, j) => j !== i) })} />
            </li>
          ))}
        </ul>
        <AddRow disabled={s.items.length >= 12} onClick={() => onChange({ ...s, items: [...s.items, { label: '', value: '', note: '', highlight: false }] })}>
          Añadir métrica
        </AddRow>
      </>
    )
  }

  if (s.type === 'FLOW') {
    const set = (i: number, patch: Partial<(typeof s.steps)[number]>) =>
      onChange({ ...s, steps: s.steps.map((st, j) => (j === i ? { ...st, ...patch } : st)) })
    const move = (i: number, dir: -1 | 1) => {
      const steps = [...s.steps]
      ;[steps[i], steps[i + dir]] = [steps[i + dir], steps[i]]
      onChange({ ...s, steps })
    }
    return (
      <>
        <ol className="space-y-3">
          {s.steps.map((st, i) => (
            <li key={i} className="flex gap-3">
              <span className="pixel text-accent w-6 shrink-0 pt-3.5">{String(i + 1).padStart(2, '0')}</span>
              <div className="min-w-0 flex-1 space-y-2">
                <input className="field !bg-bg font-medium" value={st.title} onChange={(e) => set(i, { title: e.target.value })} maxLength={100} placeholder="Nombre del paso" aria-label={`Paso ${i + 1}`} />
                <textarea className="field !bg-bg min-h-20" value={st.text} onChange={(e) => set(i, { text: e.target.value })} maxLength={1000} placeholder="Qué ocurre en este paso" aria-label={`Descripción del paso ${i + 1}`} />
              </div>
              <div className="flex flex-col items-end gap-1 pt-1 text-sm">
                <button type="button" className="text-dim hover:text-ink px-1 disabled:opacity-25" disabled={i === 0} onClick={() => move(i, -1)}>
                  Subir
                </button>
                <button type="button" className="text-dim hover:text-ink px-1 disabled:opacity-25" disabled={i === s.steps.length - 1} onClick={() => move(i, 1)}>
                  Bajar
                </button>
                <RowRemove onClick={() => onChange({ ...s, steps: s.steps.filter((_, j) => j !== i) })} />
              </div>
            </li>
          ))}
        </ol>
        <AddRow disabled={s.steps.length >= 20} onClick={() => onChange({ ...s, steps: [...s.steps, { title: '', text: '' }] })}>
          Añadir paso
        </AddRow>
      </>
    )
  }

  const set = (i: number, patch: Partial<(typeof s.items)[number]>) =>
    onChange({ ...s, items: s.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) })
  return (
    <>
      <ul className="space-y-3">
        {s.items.map((it, i) => (
          <li key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <input className="field !bg-bg font-medium" value={it.title} onChange={(e) => set(i, { title: e.target.value })} maxLength={120} placeholder="Título de la guía: Instalación, Arquitectura…" aria-label="Título de la guía" />
              <RowRemove onClick={() => onChange({ ...s, items: s.items.filter((_, j) => j !== i) })} />
            </div>
            <textarea className="field !bg-bg min-h-32 leading-relaxed" value={it.body} onChange={(e) => set(i, { body: e.target.value })} maxLength={20000} placeholder="Contenido en Markdown. Usa ``` para bloques de código." aria-label="Contenido de la guía" />
          </li>
        ))}
      </ul>
      <AddRow disabled={s.items.length >= 30} onClick={() => onChange({ ...s, items: [...s.items, { title: '', body: '' }] })}>
        Añadir guía
      </AddRow>
    </>
  )
}

const RowRemove = ({ onClick }: { onClick: () => void }) => (
  <button type="button" className="text-dim hover:text-danger shrink-0 px-1 py-1 text-sm" onClick={onClick}>
    Quitar
  </button>
)

const AddRow = ({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) => (
  <button type="button" className="btn mt-4 !py-1.5 text-sm" onClick={onClick} disabled={disabled}>
    {children}
  </button>
)
