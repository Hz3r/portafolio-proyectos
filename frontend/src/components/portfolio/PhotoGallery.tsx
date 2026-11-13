import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import type { GalleryCategory, GalleryItem } from '../../lib/api'

const ALL = '__todas__'
const FOLD = 9
type Shot = GalleryItem & { category: string }

/** Galería por categorías: certificados, cursos, eventos… Se filtra con las pestañas y cada imagen se amplía. */
export default function PhotoGallery({ categories }: { categories: GalleryCategory[] }) {
  const [active, setActive] = useState(ALL)
  const [expanded, setExpanded] = useState(false)
  const [open, setOpen] = useState<number | null>(null)

  const all: Shot[] = categories.flatMap((c) => c.items.map((i) => ({ ...i, category: c.name })))
  const shots = active === ALL ? all : all.filter((s) => s.category === categories.find((c) => c.id === active)?.name)
  const visible = expanded ? shots : shots.slice(0, FOLD)
  const tabs = [...(categories.length > 1 ? [{ id: ALL, name: 'Todas', count: all.length }] : []), ...categories.map((c) => ({ id: c.id, name: c.name, count: c.items.length }))]
  const current = categories.length > 1 ? active : categories[0].id

  return (
    <div>
      <div role="tablist" aria-label="Categorías de la galería" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {tabs.map((t) => {
          const on = t.id === current
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => (setActive(t.id), setExpanded(false))}
              className={`relative flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                on ? 'text-bg border-transparent' : 'border-line text-dim hover:border-dim hover:text-ink'
              }`}
            >
              {on && <motion.span layoutId="gallery-tab" className="bg-accent absolute inset-0 rounded-full" transition={{ duration: 0.25 }} />}
              <span className="relative">{t.name}</span>
              <span className={`pixel relative ${on ? '' : 'text-accent'}`}>{t.count}</span>
            </button>
          )
        })}
      </div>

      {/* Columnas: cada imagen conserva su proporción, sin recortes. */}
      <ul className="mt-8 columns-2 gap-4 sm:gap-5 lg:columns-3">
        {visible.map((shot) => (
          <li key={shot.id} className="mb-6 break-inside-avoid sm:mb-7">
            <button type="button" onClick={() => setOpen(shots.indexOf(shot))} className="group block w-full cursor-zoom-in text-left" aria-label={`Ampliar ${shot.title || 'imagen'}`}>
              <span className="bg-surface border-line group-hover:border-accent/60 block overflow-hidden rounded-[1.5rem] border transition-colors sm:rounded-[1.75rem]">
                <img
                  src={shot.url}
                  alt={shot.title}
                  width={shot.width ?? undefined}
                  height={shot.height ?? undefined}
                  loading="lazy"
                  decoding="async"
                  className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </span>
              {(shot.title || current === ALL) && (
                <span className="mt-3 block px-1">
                  {shot.title && <span className="block leading-snug font-medium text-pretty">{shot.title}</span>}
                  {current === ALL && <span className="text-dim mt-0.5 block text-sm">{shot.category}</span>}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {shots.length > FOLD && !expanded && (
        <div className="mt-2 text-center">
          <button type="button" onClick={() => setExpanded(true)} className="border-line hover:border-dim rounded-full border px-6 py-3 font-medium transition-colors">
            Ver las {shots.length} imágenes
          </button>
        </div>
      )}

      <AnimatePresence>{open !== null && shots[open] && <Viewer shots={shots} index={open} setIndex={setOpen} />}</AnimatePresence>
    </div>
  )
}

function Viewer({ shots, index, setIndex }: { shots: Shot[]; index: number; setIndex: (i: number | null) => void }) {
  const many = shots.length > 1
  const go = useCallback((step: number) => setIndex((index + step + shots.length) % shots.length), [index, shots.length, setIndex])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIndex(null)
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [go, setIndex])

  const shot = shots[index]
  const control = 'pixel border-line bg-surface/80 text-ink hover:border-accent hover:text-accent rounded-full border px-4 py-3 backdrop-blur transition-colors'

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={shot.title || 'Imagen de la galería'}
      className="bg-bg/95 fixed inset-0 z-40 flex flex-col backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => setIndex(null)}
    >
      <div className="flex items-center justify-between p-4">
        <p className="pixel text-dim" aria-live="polite">
          <span className="text-accent">{String(index + 1).padStart(2, '0')}</span> / {String(shots.length).padStart(2, '0')}
        </p>
        <button type="button" autoFocus className={control} onClick={() => setIndex(null)}>
          Cerrar
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={shot.id}
            src={shot.url}
            alt={shot.title}
            className="absolute inset-0 m-auto max-h-full max-w-full touch-pan-y rounded-2xl object-contain px-3 select-none"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            drag={many ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            onDragEnd={(_, info) => {
              if (info.offset.x < -70) go(1)
              else if (info.offset.x > 70) go(-1)
            }}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </AnimatePresence>
      </div>

      <div className="mx-auto w-full max-w-2xl px-5 pt-4 text-center" onClick={(e) => e.stopPropagation()}>
        {shot.title && <p className="text-lg font-semibold tracking-tight text-balance">{shot.title}</p>}
        <p className="text-dim text-sm">{shot.category}</p>
        {shot.text && <p className="text-ink/80 mt-2 leading-snug text-pretty whitespace-pre-line">{shot.text}</p>}
      </div>
      <div className="flex min-h-[4.5rem] items-center justify-center gap-3 p-4" onClick={(e) => e.stopPropagation()}>
        {many && (
          <>
            <button type="button" className={control} onClick={() => go(-1)}>
              Anterior
            </button>
            <button type="button" className={control} onClick={() => go(1)}>
              Siguiente
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}
