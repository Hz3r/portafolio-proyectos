import { useRef, useState } from 'react'
import type { Owner, Project, Section } from '../lib/api'
import { excerpt, pad } from '../lib/api'
import { Lock } from './ProjectGrid'
import Roamers from './Roamers'
import Sheet from './Sheet'
import TagBadge from './TagBadge'

const MAX_SLIDES = 8
const FALLBACK = { TEXT: 'Contexto', MEDIA: 'Galería', METRICS: 'Resultados', FLOW: 'Cómo funciona', DOCS: 'Documentación' }

/** Vista rápida de un proyecto: lo esencial, sin salir de la portada. */
export default function QuickView({ project, owner, number, onClose }: { project: Project; owner: Owner; number: number; onClose: () => void }) {
  // Portada primero; después el resto de imágenes y videos, en su orden.
  const slides = [...project.media]
    .sort((a, b) => Number(b.id === project.cover?.id) - Number(a.id === project.cover?.id))
    .filter((m) => (m.type === 'EMBED' ? m.embedUrl : m.url))
    .slice(0, MAX_SLIDES)
  const [slide, setSlide] = useState(0)
  // Capítulo abierto dentro del modal; null = vista general.
  const [chapterId, setChapterId] = useState<string | null>(null)
  const body = useRef<HTMLDivElement>(null)
  const strip = useRef<HTMLDivElement>(null)
  const go = (i: number) => strip.current?.scrollTo({ left: i * strip.current.clientWidth, behavior: 'smooth' })

  const heading = 'text-dim text-sm font-medium'
  const summary = excerpt(project.description)
  // Cifras para leer de un vistazo: las destacadas primero.
  const metrics = project.sections
    .flatMap((s) => (s.type === 'METRICS' ? s.items : []))
    .filter((m) => m.value)
    .sort((a, b) => Number(b.highlight) - Number(a.highlight))
    .slice(0, 3)
  const chapters = project.sections.map((s) => ({ id: s.id, title: s.title || FALLBACK[s.type], section: s }))
  const chapterIndex = chapters.findIndex((c) => c.id === chapterId)
  const chapter = chapters[chapterIndex]
  const openChapter = (id: string | null) => {
    setChapterId(id)
    body.current?.scrollIntoView({ block: 'nearest' })
  }
  const technologies = project.tags.length > 0 && (
    <>
      <h3 className={heading}>Tecnologías</h3>
      <ul className="mt-2.5 flex flex-wrap gap-2">
        {project.tags.map((t) => (
          <li key={t.id}>
            <TagBadge tag={t} />
          </li>
        ))}
      </ul>
    </>
  )

  const mine = project.myRole === 'AUTHOR'
  const others = project.people.map((p) => p.name).join(', ')
  const credit = mine
    ? `Proyecto de ${owner.handle}${others ? `, con ${others}` : ''}`
    : `Colaboración de ${owner.handle}${others ? ` en el proyecto de ${others}` : ''}`
  const nav =
    'bg-bg/75 border-line text-ink hover:border-accent hover:text-accent absolute top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur transition-colors disabled:opacity-0 sm:flex'

  return (
    <Sheet label={`Vista rápida de ${project.title}`} onClose={onClose} wide>
      {/* Personajes de fondo, por detrás del contenido. */}
      <Roamers kinds={['robot', 'chispa', 'estrella', 'fantasma', 'nudo', 'gato']} mobile={3} speed={20} className="absolute inset-0 opacity-25" />
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {slides.length > 0 && (
          <div className="lg:sticky lg:top-0 lg:self-start lg:p-5 lg:pr-0">
            <div className="bg-bg relative overflow-hidden lg:rounded-2xl">
              <div
                ref={strip}
                onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
                className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
              >
                {slides.map((m, i) => (
                  <div key={m.id} className="aspect-[16/10] w-full shrink-0 snap-center">
                    {m.type === 'IMAGE' && (
                      <img
                        src={m.url!}
                        alt={m.alt || `${project.title}, imagen ${i + 1}`}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        className="h-full w-full object-cover"
                      />
                    )}
                    {m.type === 'VIDEO' && (
                      <video
                        src={m.url!}
                        poster={m.posterUrl ?? undefined}
                        controls
                        playsInline
                        preload="none"
                        className="h-full w-full bg-black object-contain"
                        aria-label={m.alt || `Video de ${project.title}`}
                      />
                    )}
                    {/* El reproductor externo solo se carga al llegar a su diapositiva. */}
                    {m.type === 'EMBED' &&
                      (i === slide ? (
                        <iframe
                          src={m.embedUrl!}
                          title={m.alt || `Video de ${project.title}`}
                          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                          allowFullScreen
                          className="h-full w-full"
                        />
                      ) : (
                        <div className="text-dim flex h-full items-center justify-center text-sm">Video</div>
                      ))}
                  </div>
                ))}
              </div>
              {slides.length > 1 && (
                <>
                  <button type="button" className={`${nav} left-3`} onClick={() => go(slide - 1)} disabled={slide === 0} aria-label="Anterior">
                    <span aria-hidden="true">◀</span>
                  </button>
                  <button type="button" className={`${nav} right-3`} onClick={() => go(slide + 1)} disabled={slide === slides.length - 1} aria-label="Siguiente">
                    <span aria-hidden="true">▶</span>
                  </button>
                  <p className="pixel bg-bg/75 text-dim absolute bottom-3 left-3 rounded-full px-2.5 py-2 backdrop-blur" aria-live="polite">
                    <span className="text-accent">{pad(slide + 1)}</span> / {pad(slides.length)}
                  </p>
                </>
              )}
            </div>

            {slides.length > 1 && (
              <ul className="hidden gap-2 overflow-x-auto pt-3 [scrollbar-width:none] lg:flex">
                {slides.map((m, i) => {
                  const still = m.type === 'IMAGE' ? m.url : m.posterUrl
                  return (
                    <li key={m.id} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => go(i)}
                        aria-label={`Ir a ${m.type === 'IMAGE' ? 'la imagen' : 'el video'} ${i + 1}`}
                        aria-current={i === slide}
                        className={`bg-bg block aspect-[16/10] w-20 overflow-hidden rounded-lg border-2 transition-opacity ${
                          i === slide ? 'border-accent' : 'border-transparent opacity-55 hover:opacity-100'
                        }`}
                      >
                        {still ? (
                          <img src={still} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-dim flex h-full items-center justify-center text-xs">Video</span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            {technologies && <section className="hidden pt-6 lg:block">{technologies}</section>}
          </div>
        )}

        <div ref={body} className={`min-w-0 scroll-mt-4 p-5 sm:p-7 ${slides.length ? '' : 'lg:col-span-2'}`}>
          <p className="pixel text-dim flex flex-wrap items-center gap-x-3 gap-y-2 pr-24">
            <span className="text-accent">{pad(number)}</span>
            {project.year && <span>{project.year}</span>}
            {!project.url && (
              <span className="flex items-center gap-1.5">
                <Lock /> Privado
              </span>
            )}
          </p>
          <h2 className="mt-3 text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">{project.title}</h2>
          {project.summary && <p className="text-dim mt-2 text-[1.0625rem] leading-snug text-pretty">{project.summary}</p>}

          {chapter ? (
            <section className="mt-5" aria-live="polite">
              <button type="button" onClick={() => openChapter(null)} className="text-dim hover:text-accent -ml-1 rounded px-1 py-1 text-sm transition-colors">
                <span aria-hidden="true">◀</span> Volver al resumen
              </button>
              <h3 className="mt-4 flex items-baseline gap-3 text-xl font-semibold tracking-tight">
                <span className="pixel text-accent">{pad(chapterIndex + 1)}</span>
                {chapter.title}
              </h3>
              <div className="mt-4">
                <ChapterSummary section={chapter.section} />
              </div>
              <div className="border-line mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-sm">
                <a href={`/p/${project.slug}#c-${chapter.id}`} className="text-accent font-medium underline underline-offset-4">
                  Ver este capítulo completo
                </a>
                {chapterIndex < chapters.length - 1 && (
                  <button type="button" onClick={() => openChapter(chapters[chapterIndex + 1].id)} className="text-dim hover:text-ink">
                    Siguiente: {chapters[chapterIndex + 1].title} <span aria-hidden="true">▶</span>
                  </button>
                )}
              </div>
            </section>
          ) : (
            <>
          {metrics.length > 0 && (
            <dl className="mt-5 grid grid-cols-3 gap-2">
              {metrics.map((m, i) => (
                <div key={i} className={`bg-bg flex min-w-0 flex-col rounded-xl border px-3 py-3 ${m.highlight ? 'border-accent/40' : 'border-line'}`}>
                  <dd className={`order-1 truncate text-lg font-semibold tracking-tight tabular-nums sm:text-xl ${m.highlight ? 'text-accent' : ''}`}>{m.value}</dd>
                  {m.label && <dt className="text-dim order-2 mt-0.5 line-clamp-2 text-xs leading-snug">{m.label}</dt>}
                </div>
              ))}
            </dl>
          )}

          {summary && (
            <section className="mt-6">
              <h3 className={heading}>Resumen</h3>
              <p className="mt-2 leading-relaxed text-pretty">{summary}</p>
            </section>
          )}

          {technologies && <section className={`mt-6 ${slides.length ? 'lg:hidden' : ''}`}>{technologies}</section>}

          {chapters.length > 0 && (
            <section className="mt-6">
              <h3 className={heading}>Capítulos</h3>
              <ol className="border-line divide-line mt-2.5 divide-y rounded-xl border">
                {chapters.map((c, i) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => openChapter(c.id)}
                      className="hover:text-accent flex w-full items-baseline gap-3 px-3.5 py-3 text-left text-[0.9375rem] transition-colors"
                    >
                      <span className="pixel text-accent">{pad(i + 1)}</span>
                      <span className="min-w-0 flex-1">{c.title}</span>
                      <span className="text-dim text-xs" aria-hidden="true">
                        ▶
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}

            </>
          )}

          <p className="text-dim mt-6 text-sm">{credit}</p>
        </div>
      </div>

      <div className="border-line bg-surface relative flex flex-wrap items-center gap-2 border-t p-3 sm:px-5 sm:py-4">
        <a
          href={`/p/${project.slug}`}
          className="bg-accent text-bg inline-flex min-w-0 flex-1 items-center justify-center gap-2.5 rounded-full px-5 py-3 font-medium transition-transform hover:scale-[1.02] active:scale-[0.98] sm:flex-none"
        >
          <span className="text-xs" aria-hidden="true">
            ▶
          </span>
          <span className="whitespace-nowrap sm:hidden">Ver proyecto</span>
          <span className="whitespace-nowrap max-sm:hidden">Ver el proyecto completo</span>
        </a>
        {project.url && (
          <a href={project.url} target="_blank" rel="noopener noreferrer" className="border-line hover:border-accent hover:text-accent rounded-full border px-4 py-3 font-medium transition-colors">
            Visitar
          </a>
        )}
        {project.repoUrl && (
          <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="border-line hover:border-accent hover:text-accent rounded-full border px-4 py-3 font-medium transition-colors">
            Código
          </a>
        )}
      </div>
    </Sheet>
  )
}

/** Resumen corto de un capítulo para la vista rápida. */
function ChapterSummary({ section: s }: { section: Section }) {
  const empty = <p className="text-dim">Este capítulo aún no tiene contenido.</p>

  if (s.type === 'TEXT') {
    const text = excerpt(s.body, 460)
    return text ? <p className="leading-relaxed text-pretty">{text}</p> : empty
  }

  if (s.type === 'METRICS') {
    const items = s.items.filter((m) => m.value)
    if (!items.length) return empty
    return (
      <dl className="grid grid-cols-2 gap-2">
        {items.slice(0, 6).map((m, i) => (
          <div key={i} className={`bg-bg flex min-w-0 flex-col rounded-xl border px-3.5 py-3 ${m.highlight ? 'border-accent/40' : 'border-line'}`}>
            <dd className={`order-1 truncate text-xl font-semibold tracking-tight tabular-nums ${m.highlight ? 'text-accent' : ''}`}>{m.value}</dd>
            {m.label && <dt className="text-dim order-2 mt-0.5 text-sm leading-snug">{m.label}</dt>}
          </div>
        ))}
      </dl>
    )
  }

  if (s.type === 'FLOW') {
    const steps = s.steps.filter((st) => st.title || st.text)
    if (!steps.length) return empty
    return (
      <ol className="space-y-3">
        {steps.slice(0, 6).map((st, i) => (
          <li key={i} className="flex gap-3">
            <span className="pixel border-line bg-bg text-accent flex size-8 shrink-0 items-center justify-center rounded-lg border">{pad(i + 1)}</span>
            <div className="min-w-0 pt-1">
              <p className="font-medium">{st.title || `Paso ${i + 1}`}</p>
              {st.text && <p className="text-dim mt-0.5 line-clamp-2 text-sm leading-snug">{st.text}</p>}
            </div>
          </li>
        ))}
        {steps.length > 6 && <li className="text-dim text-sm">y {steps.length - 6} pasos más</li>}
      </ol>
    )
  }

  if (s.type === 'MEDIA') {
    const stills = s.media.flatMap((m) => {
      const src = m.type === 'IMAGE' ? m.url : m.posterUrl
      return src ? [{ id: m.id, src, alt: m.alt }] : []
    })
    const videos = s.media.filter((m) => m.type !== 'IMAGE').length
    if (!s.media.length) return empty
    return (
      <>
        {stills.length > 0 && (
          <ul className="grid grid-cols-3 gap-2">
            {stills.slice(0, 6).map((m) => (
              <li key={m.id} className="bg-bg border-line aspect-[16/10] overflow-hidden rounded-lg border">
                <img src={m.src} alt={m.alt} loading="lazy" className="h-full w-full object-cover" />
              </li>
            ))}
          </ul>
        )}
        <p className="text-dim mt-3 text-sm">
          {s.caption || `${s.media.length} ${s.media.length === 1 ? 'archivo' : 'archivos'}`}
          {videos > 0 && `${s.caption ? ' ' : ', '}${videos === 1 ? 'incluye un video' : `incluye ${videos} videos`}.`}
        </p>
      </>
    )
  }

  const guides = s.items.filter((d) => d.title || d.body.trim())
  if (!guides.length) return empty
  return (
    <ul className="border-line divide-line divide-y rounded-xl border">
      {guides.slice(0, 8).map((d, i) => (
        <li key={i} className="px-3.5 py-3">
          <p className="font-medium">{d.title || `Guía ${i + 1}`}</p>
          {d.body.trim() && <p className="text-dim mt-0.5 line-clamp-2 text-sm leading-snug">{excerpt(d.body, 150)}</p>}
        </li>
      ))}
    </ul>
  )
}
