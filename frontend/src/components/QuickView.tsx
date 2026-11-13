import { useRef, useState } from 'react'
import type { Owner, Project } from '../lib/api'
import { excerpt, pad } from '../lib/api'
import { Lock } from './ProjectGrid'
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
  const strip = useRef<HTMLDivElement>(null)
  const go = (i: number) => strip.current?.scrollTo({ left: i * strip.current.clientWidth, behavior: 'smooth' })

  const summary = excerpt(project.description)
  // Cifras para leer de un vistazo: las destacadas primero.
  const metrics = project.sections
    .flatMap((s) => (s.type === 'METRICS' ? s.items : []))
    .filter((m) => m.value)
    .sort((a, b) => Number(b.highlight) - Number(a.highlight))
    .slice(0, 3)
  const chapters = project.sections.map((s) => ({ id: s.id, title: s.title || FALLBACK[s.type] }))

  const mine = project.myRole === 'AUTHOR'
  const others = project.people.map((p) => p.name).join(', ')
  const credit = mine
    ? `Proyecto de ${owner.handle}${others ? `, con ${others}` : ''}`
    : `Colaboración de ${owner.handle}${others ? ` en el proyecto de ${others}` : ''}`
  const heading = 'text-dim text-sm font-medium'
  const nav =
    'bg-bg/75 border-line text-ink hover:border-accent hover:text-accent absolute top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur transition-colors disabled:opacity-0 sm:flex'

  return (
    <Sheet label={`Vista rápida de ${project.title}`} onClose={onClose} wide>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
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
          </div>
        )}

        <div className={`min-w-0 p-5 sm:p-7 ${slides.length ? '' : 'lg:col-span-2'}`}>
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

          {project.tags.length > 0 && (
            <section className="mt-6">
              <h3 className={heading}>Tecnologías</h3>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {project.tags.map((t) => (
                  <li key={t.id}>
                    <TagBadge tag={t} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {chapters.length > 1 && (
            <section className="mt-6">
              <h3 className={heading}>En la historia completa</h3>
              <ol className="border-line divide-line mt-2.5 divide-y rounded-xl border">
                {chapters.map((c, i) => (
                  <li key={c.id}>
                    <a href={`/p/${project.slug}#c-${c.id}`} className="hover:text-accent flex items-baseline gap-3 px-3.5 py-2.5 text-[0.9375rem] transition-colors">
                      <span className="pixel text-accent">{pad(i + 1)}</span>
                      {c.title}
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <p className="text-dim mt-6 text-sm">{credit}</p>
        </div>
      </div>

      <div className="border-line bg-surface flex flex-wrap items-center gap-2 border-t p-3 sm:px-5 sm:py-4">
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
