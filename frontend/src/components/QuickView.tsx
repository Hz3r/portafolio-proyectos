import { useRef, useState } from 'react'
import type { Project } from '../lib/api'
import { Lock } from './ProjectGrid'
import Sheet from './Sheet'
import TagBadge from './TagBadge'

/** Vista rápida de un proyecto: lo esencial sin salir de la portada. */
export default function QuickView({ project, onClose }: { project: Project; onClose: () => void }) {
  // Portada primero, luego hasta cinco imágenes más (o pósters de video).
  const stills = [project.cover, ...project.media.filter((m) => m.id !== project.cover?.id)]
    .flatMap((m) => {
      const src = m ? (m.type === 'IMAGE' ? m.url : m.posterUrl) : null
      return m && src ? [{ id: m.id, src, alt: m.alt }] : []
    })
    .slice(0, 6)
  const [slide, setSlide] = useState(0)
  const strip = useRef<HTMLDivElement>(null)

  // Cifras para leer de un vistazo: las destacadas primero.
  const metrics = project.sections
    .flatMap((s) => (s.type === 'METRICS' ? s.items : []))
    .filter((m) => m.value && m.label)
    .sort((a, b) => Number(b.highlight) - Number(a.highlight))
    .slice(0, 3)
  const chapters = project.sections.filter((s) => s.title).length

  return (
    <Sheet label={`Vista rápida de ${project.title}`} onClose={onClose} wide>
      <div className="overflow-y-auto overscroll-contain lg:grid lg:grid-cols-[1.2fr_1fr] lg:items-center">
        {stills.length > 0 && (
          <div className="bg-bg relative lg:self-stretch">
            <div
              ref={strip}
              onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
              className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] lg:h-full"
            >
              {stills.map((s, i) => (
                <img
                  key={s.id}
                  src={s.src}
                  alt={s.alt || `${project.title}, imagen ${i + 1}`}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  className="bg-bg aspect-[16/10] w-full shrink-0 snap-center object-cover lg:aspect-auto lg:h-full lg:min-h-[26rem]"
                />
              ))}
            </div>
            {stills.length > 1 && (
              <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                {stills.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`Imagen ${i + 1} de ${stills.length}`}
                    aria-current={i === slide}
                    onClick={() => strip.current?.scrollTo({ left: i * strip.current.clientWidth, behavior: 'smooth' })}
                    className="p-1.5"
                  >
                    <span className={`block size-2 transition-colors ${i === slide ? 'bg-accent' : 'bg-ink/35'}`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-5 sm:p-8 lg:pt-16">
          <h2 className={`text-2xl font-semibold tracking-tight text-balance sm:text-3xl ${stills.length ? '' : 'pr-24'}`}>{project.title}</h2>
          {project.summary && <p className="text-dim mt-2 text-[1.0625rem] leading-snug text-pretty sm:text-lg">{project.summary}</p>}

          {(project.tags.length > 0 || project.year) && (
            <ul className="mt-5 flex flex-wrap items-center gap-2">
              {project.tags.map((t) => (
                <li key={t.id}>
                  <TagBadge tag={t} />
                </li>
              ))}
              {project.year && <li className="pixel text-dim px-2">{project.year}</li>}
            </ul>
          )}

          {metrics.length > 0 && (
            <dl className="border-line mt-6 grid grid-cols-3 gap-x-4 border-t pt-5 lg:gap-x-3">
              {metrics.map((m) => (
                <div key={m.label} className="flex min-w-0 flex-col">
                  <dd className={`order-1 truncate text-xl font-semibold tracking-tight tabular-nums sm:text-2xl ${m.highlight ? 'text-accent' : ''}`}>
                    {m.value}
                  </dd>
                  <dt className="text-dim order-2 mt-1 text-sm leading-snug">{m.label}</dt>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <a
              href={`/p/${project.slug}`}
              className="bg-accent text-bg inline-flex items-center gap-2.5 rounded-full py-3 pr-5 pl-4 font-medium transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              <span className="text-xs" aria-hidden="true">
                ▶
              </span>
              {chapters > 1 ? `Ver la historia completa (${chapters} capítulos)` : 'Ver el proyecto completo'}
            </a>
            {project.url && (
              <a href={project.url} target="_blank" rel="noopener noreferrer" className="border-line hover:border-accent hover:text-accent rounded-full border px-5 py-3 font-medium transition-colors">
                Visitar
              </a>
            )}
            {project.repoUrl && (
              <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="border-line hover:border-accent hover:text-accent rounded-full border px-5 py-3 font-medium transition-colors">
                Repositorio
              </a>
            )}
            {!project.url && (
              <span className="pixel text-dim flex items-center gap-1.5 px-2">
                <Lock /> Privado
              </span>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  )
}
