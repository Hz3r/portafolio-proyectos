'use client'

import { rectSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useRef, useState } from 'react'
import { presignUpload } from '@/app/actions'
import type { GalleryCategory, GalleryItem } from '@/lib/types'
import { imageSize, uploadFile } from '@/lib/upload'
import { Grip, SortableItem, SortableList } from './Sortable'

const SUGGESTED = ['Certificaciones', 'Cursos', 'Educación', 'Trabajos', 'Eventos', 'Instalaciones']
const TYPES = 'image/jpeg,image/png,image/webp,image/avif'
const MAX_ITEMS = 60
const uid = () => Math.random().toString(36).slice(2, 10)

/** Galería del portafolio: categorías ordenables, cada una con sus imágenes. */
export default function GalleryEditor({ value, onChange, onError }: { value: GalleryCategory[]; onChange: (next: GalleryCategory[]) => void; onError: (text: string) => void }) {
  const [name, setName] = useState('')
  const names = value.map((c) => c.name.trim().toLowerCase())
  const add = (raw: string) => {
    const clean = raw.trim()
    if (!clean || names.includes(clean.toLowerCase())) return
    onChange([...value, { id: uid(), name: clean, items: [] }])
    setName('')
  }
  const patch = (id: string, next: Partial<GalleryCategory>) => onChange(value.map((c) => (c.id === id ? { ...c, ...next } : c)))
  const unused = SUGGESTED.filter((s) => !names.includes(s.toLowerCase()))

  return (
    <div>
      <p className="text-dim max-w-2xl text-sm">
        Imágenes agrupadas por categoría: certificados, cursos, fotos de eventos, instalaciones. En el sitio cada categoría es una pestaña y
        las imágenes se amplían al tocarlas. Una categoría sin imágenes no se muestra.
      </p>

      {value.length > 0 && (
        <SortableList items={value} strategy={verticalListSortingStrategy} onReorder={onChange}>
          <ul className="mt-5 space-y-4">
            {value.map((category) => (
              <SortableItem key={category.id} id={category.id}>
                {(handle, dragging) => (
                  <Category
                    category={category}
                    handle={handle}
                    dragging={dragging}
                    onChange={(next) => patch(category.id, next)}
                    onError={onError}
                    onRemove={() => {
                      const n = category.items.length
                      if (n && !confirm(`¿Quitar “${category.name}” con ${n === 1 ? 'su imagen' : `sus ${n} imágenes`}? Se borran al guardar.`)) return
                      onChange(value.filter((c) => c.id !== category.id))
                    }}
                  />
                )}
              </SortableItem>
            ))}
          </ul>
        </SortableList>
      )}

      <form onSubmit={(e) => (e.preventDefault(), add(name))} className="border-line mt-5 rounded-2xl border border-dashed p-4 sm:p-5">
        <label className="label" htmlFor="gallery-category">
          Nueva categoría
        </label>
        <div className="flex flex-wrap gap-2">
          <input id="gallery-category" className="field !bg-bg max-w-xs" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Nombre de la categoría" />
          <button className="btn" disabled={!name.trim() || value.length >= 12}>
            Crear categoría
          </button>
        </div>
        {unused.length > 0 && value.length < 12 && (
          <p className="text-dim mt-3 flex flex-wrap items-center gap-2 text-sm">
            O empieza con una:
            {unused.map((s) => (
              <button key={s} type="button" className="border-line hover:border-dim hover:text-ink rounded-full border px-3 py-1.5" onClick={() => add(s)}>
                {s}
              </button>
            ))}
          </p>
        )}
      </form>
    </div>
  )
}

function Category({
  category,
  handle,
  dragging,
  onChange,
  onRemove,
  onError,
}: {
  category: GalleryCategory
  handle: { ref: (el: HTMLElement | null) => void; props: Record<string, unknown> }
  dragging: boolean
  onChange: (next: Partial<GalleryCategory>) => void
  onRemove: () => void
  onError: (text: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const { items } = category
  const patch = (id: string, next: Partial<GalleryItem>) => onChange({ items: items.map((i) => (i.id === id ? { ...i, ...next } : i)) })

  const upload = async (files: File[]) => {
    const room = MAX_ITEMS - items.length
    if (files.length > room) onError(`Cada categoría admite hasta ${MAX_ITEMS} imágenes. Se suben las primeras ${room}.`)
    const added: GalleryItem[] = []
    const queue = files.slice(0, room)
    for (const [n, file] of queue.entries()) {
      setProgress(`Subiendo ${n + 1} de ${queue.length}…`)
      try {
        const presign = await presignUpload({ filename: file.name, contentType: file.type, size: file.size })
        if (!presign.ok) {
          onError(`${file.name}: ${presign.error}`)
          continue
        }
        const size = await imageSize(file)
        await uploadFile(presign.data, file, () => {})
        added.push({ id: uid(), key: presign.data.key, url: URL.createObjectURL(file), title: '', text: '', width: size?.width ?? null, height: size?.height ?? null })
      } catch {
        onError(`No se pudo subir ${file.name}. Revisa tu conexión e inténtalo de nuevo.`)
      }
    }
    setProgress(null)
    if (added.length) onChange({ items: [...items, ...added] })
  }

  return (
    <div className={`bg-bg rounded-2xl border p-3 sm:p-4 ${dragging ? 'border-accent shadow-2xl' : 'border-line'}`}>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button type="button" ref={handle.ref} {...handle.props} className="text-dim hover:text-ink touch-none px-1.5 py-3" style={{ cursor: dragging ? 'grabbing' : 'grab' }} aria-label={`Mover ${category.name}`}>
          <Grip />
        </button>
        <input className="field min-w-0 flex-1 basis-40 font-semibold" value={category.name} onChange={(e) => onChange({ name: e.target.value })} maxLength={40} placeholder="Nombre de la categoría" aria-label="Nombre de la categoría" />
        <span className="pixel text-accent">{items.length}</span>
        <button type="button" className="btn" disabled={progress !== null || items.length >= MAX_ITEMS} onClick={() => input.current?.click()}>
          {progress ?? 'Subir imágenes'}
        </button>
        <button type="button" onClick={onRemove} className="text-dim hover:text-danger px-1.5 py-2 text-sm">
          Quitar
        </button>
        <input ref={input} type="file" accept={TYPES} multiple hidden onChange={(e) => (upload([...(e.target.files ?? [])]), (e.target.value = ''))} />
      </div>

      {items.length === 0 ? (
        <p className="text-dim mt-3 px-1 text-sm">Sin imágenes todavía. Puedes subir varias a la vez (jpg, png, webp o avif, hasta 15 MB cada una).</p>
      ) : (
        <SortableList items={items} strategy={rectSortingStrategy} onReorder={(next) => onChange({ items: next })}>
          <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <SortableItem key={item.id} id={item.id}>
                {(grip, moving) => (
                  <div className={`bg-surface overflow-hidden rounded-xl border ${moving ? 'border-accent shadow-2xl' : 'border-line'}`}>
                    <div className="relative">
                      <img src={item.url} alt="" className="aspect-[4/3] w-full object-cover" />
                      <button
                        type="button"
                        ref={grip.ref}
                        {...grip.props}
                        className="bg-bg/80 text-ink absolute top-2 left-2 touch-none rounded-lg p-2 backdrop-blur"
                        style={{ cursor: moving ? 'grabbing' : 'grab' }}
                        aria-label={`Mover ${item.title || 'imagen'}`}
                      >
                        <Grip />
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange({ items: items.filter((i) => i.id !== item.id) })}
                        className="bg-bg/80 text-ink hover:text-danger absolute top-2 right-2 rounded-lg px-2.5 py-1.5 text-sm backdrop-blur"
                        aria-label={`Quitar ${item.title || 'imagen'}`}
                      >
                        Quitar
                      </button>
                    </div>
                    <div className="space-y-1.5 p-2">
                      <input className="field !rounded-lg !px-2.5 !py-1.5 text-sm" value={item.title} onChange={(e) => patch(item.id, { title: e.target.value })} maxLength={80} placeholder="Título" aria-label="Título de la imagen" />
                      <textarea className="field !rounded-lg !px-2.5 !py-1.5 text-sm" rows={2} value={item.text} onChange={(e) => patch(item.id, { text: e.target.value })} maxLength={300} placeholder="Detalle (opcional)" aria-label="Detalle de la imagen" />
                    </div>
                  </div>
                )}
              </SortableItem>
            ))}
          </ul>
        </SortableList>
      )}
    </div>
  )
}
