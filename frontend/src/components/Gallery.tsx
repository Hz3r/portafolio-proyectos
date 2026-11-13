import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import type { Media } from '../lib/api'

type Props = { media: Media[]; title: string }

export default function Gallery({ media, title }: Props) {
  const images = media.filter((m) => m.type === 'IMAGE' && m.url)
  const [open, setOpen] = useState<number | null>(null)

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        {media.map((m, i) => {
          // Videos, imágenes panorámicas y una imagen suelta al final ocupan todo el ancho.
          const alone = media.length % 2 === 1 && i === media.length - 1
          const wide = alone || m.type !== 'IMAGE' || (m.width && m.height && m.width / m.height > 2)
          const frame = `bg-surface border-line overflow-hidden rounded-2xl border ${wide ? 'sm:col-span-2' : ''}`

          if (m.type === 'IMAGE' && m.url) {
            const index = images.indexOf(m)
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setOpen(index)}
                className={`${frame} group block cursor-zoom-in`}
                aria-label={`Ampliar imagen ${index + 1} de ${images.length}`}
              >
                <img
                  src={m.url}
                  alt={m.alt || `${title}, imagen ${index + 1}`}
                  width={m.width ?? undefined}
                  height={m.height ?? undefined}
                  loading="lazy"
                  decoding="async"
                  className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.015]"
                />
              </button>
            )
          }
          if (m.type === 'VIDEO' && m.url) {
            return (
              <div key={m.id} className={frame}>
                <video
                  src={m.url}
                  poster={m.posterUrl ?? undefined}
                  controls
                  playsInline
                  preload="metadata"
                  className="aspect-video h-auto w-full bg-black"
                  aria-label={m.alt || `Video de ${title}`}
                />
              </div>
            )
          }
          if (m.type === 'EMBED' && m.embedUrl) {
            return (
              <div key={m.id} className={frame}>
                <iframe
                  src={m.embedUrl}
                  title={m.alt || `Video de ${title}`}
                  loading="lazy"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="aspect-video w-full"
                />
              </div>
            )
          }
          return null
        })}
      </div>
      <AnimatePresence>
        {open !== null && <Lightbox images={images} index={open} setIndex={setOpen} title={title} />}
      </AnimatePresence>
    </>
  )
}

function Lightbox({
  images,
  index,
  setIndex,
  title,
}: {
  images: Media[]
  index: number
  setIndex: (i: number | null) => void
  title: string
}) {
  const many = images.length > 1
  const go = useCallback(
    (step: number) => setIndex((index + step + images.length) % images.length),
    [index, images.length, setIndex],
  )

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

  const current = images[index]
  const control =
    'pixel border-line bg-surface/80 text-ink hover:border-accent hover:text-accent rounded-full border px-4 py-3 backdrop-blur transition-colors'

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Galería de ${title}`}
      className="bg-bg/95 fixed inset-0 z-40 flex flex-col backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => setIndex(null)}
    >
      <div className="flex items-center justify-between p-4">
        <p className="pixel text-dim" aria-live="polite">
          <span className="text-accent">{String(index + 1).padStart(2, '0')}</span> / {String(images.length).padStart(2, '0')}
        </p>
        <button type="button" autoFocus className={control} onClick={() => setIndex(null)}>
          Cerrar
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={current.id}
            src={current.url!}
            alt={current.alt || `${title}, imagen ${index + 1}`}
            className="absolute inset-0 m-auto max-h-full max-w-full touch-pan-y rounded-lg object-contain px-3 select-none"
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
