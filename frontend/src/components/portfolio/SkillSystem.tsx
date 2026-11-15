import { motion } from 'motion/react'
import { useRef, useState } from 'react'
import { type SkillGroup, type Tag, tagHref } from '../../lib/api'
import Sprite from '../Sprite'
import { TagIcon } from '../TagBadge'

// Tres órbitas: cuanto más cerca del centro, más dominada está la tecnología.
const RINGS = [
  { level: 3, label: 'Las domino', orbit: 'Órbita interior', inset: 'inset-[27%]', line: 'border-accent/60', seconds: 70 },
  { level: 2, label: 'Las uso con soltura', orbit: 'Órbita media', inset: 'inset-[13.5%]', line: 'border-line', seconds: 110 },
  { level: 1, label: 'Las estoy aprendiendo', orbit: 'Órbita exterior', inset: 'inset-0', line: 'border-line border-dashed', seconds: 150 },
]
type View = 'nivel' | 'area'
const levelOf = (tag: Tag) => tag.skillLevel ?? 2

/** Una habilidad en la lista por área. Si tiene proyectos publicados, lleva a verlos ya filtrados. */
function Chip({ tag }: { tag: Tag }) {
  const base = 'border-line bg-bg inline-flex items-center gap-2 rounded-full border py-1.5 pr-3 pl-2.5 text-sm'
  if (!tag.projectCount) {
    return (
      <span className={base}>
        <TagIcon tag={tag} size={15} />
        {tag.name}
      </span>
    )
  }
  return (
    <a href={tagHref(tag)} title={`Ver ${tag.projectCount} ${tag.projectCount === 1 ? 'proyecto' : 'proyectos'} con ${tag.name}`} className={`${base} hover:border-accent transition-colors`}>
      <TagIcon tag={tag} size={15} />
      {tag.name}
      <span className="pixel text-accent">{tag.projectCount}</span>
    </a>
  )
}

/** Habilidades como un sistema de órbitas por nivel de dominio, o como lista por área. */
export default function SkillSystem({ groups }: { groups: SkillGroup[] }) {
  const [view, setView] = useState<View>('nivel')
  // Pasar el cursor muestra el detalle un momento; un clic lo deja fijo.
  const [hover, setHover] = useState<Tag | null>(null)
  const [pinned, setPinned] = useState<Tag | null>(null)
  const [paused, setPaused] = useState(false)
  const reader = useRef<HTMLDivElement>(null)
  const all = groups.flatMap((g) => g.tags)
  const groupOf = (tag: Tag) => groups.find((g) => g.tags.some((t) => t.id === tag.id))?.group || 'Otras'
  const shown = hover ?? pinned
  const ring = shown ? RINGS.find((r) => r.level === levelOf(shown)) : null
  const pin = (tag: Tag) => {
    const next = pinned?.id === tag.id ? null : tag
    setPinned(next)
    // En celular el detalle queda debajo del sistema: lo acerca a la vista.
    if (next && matchMedia('(max-width: 1023px)').matches) requestAnimationFrame(() => reader.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-dim max-w-md text-sm">
          {view === 'nivel' ? 'Cuanto más cerca del centro, más la domino. Haz clic en un planeta para dejar su detalle a la vista.' : 'Las que llevan un número se usan en proyectos publicados: tócalas para verlos.'}
        </p>
        <div role="tablist" aria-label="Cómo ordenar las habilidades" className="border-line flex rounded-full border p-1">
          {(['nivel', 'area'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${view === v ? 'text-bg' : 'text-dim hover:text-ink'}`}
            >
              {view === v && <motion.span layoutId="skill-view" className="bg-accent absolute inset-0 rounded-full" transition={{ duration: 0.25 }} />}
              <span className="relative">{v === 'nivel' ? 'Por nivel' : 'Por área'}</span>
            </button>
          ))}
        </div>
      </div>

      {view === 'nivel' ? (
        <div className="mt-6 grid items-center gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          {/* Los planetas giran sobre cuadrados rotados que sobresalen: el contenedor los recorta para no ensanchar la página. */}
          <div className="-mx-5 overflow-hidden px-5 py-7 sm:mx-0 sm:px-7">
            <div
              className={`skill-system relative mx-auto aspect-square w-full max-w-[36rem] ${paused || hover ? 'paused' : ''}`}
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => (setPaused(false), setHover(null))}
              // Un clic en el espacio vacío suelta el planeta fijado.
              onClick={(e) => !(e.target as HTMLElement).closest('button') && setPinned(null)}
            >
              {RINGS.map((r) => (
                <div key={r.level} className={`absolute rounded-full border ${r.inset} ${r.line}`} aria-hidden="true" />
              ))}
              <div className="bg-surface border-line absolute inset-[41%] flex items-center justify-center rounded-full border" aria-hidden="true">
                <Sprite kind="robot" size={34} />
              </div>

              {RINGS.flatMap((r, ringIndex) => {
                const tags = all.filter((t) => levelOf(t) === r.level)
                return tags.map((tag, i) => {
                  const on = shown?.id === tag.id
                  const fixed = pinned?.id === tag.id
                  return (
                    <span
                      key={tag.id}
                      className={`orbit-item ${r.inset} ${ringIndex % 2 ? 'rev' : ''}`}
                      style={{ ['--o' as string]: (i + ringIndex * 0.37) / tags.length, ['--d' as string]: `${r.seconds}s` }}
                    >
                      <span>
                        <button
                          type="button"
                          onMouseEnter={() => setHover(tag)}
                          onMouseLeave={() => setHover(null)}
                          onFocus={() => setHover(tag)}
                          onBlur={() => setHover(null)}
                          onClick={() => pin(tag)}
                          aria-label={`${tag.name}: ${r.label.toLowerCase()}`}
                          aria-pressed={fixed}
                          className={`bg-bg flex size-10 items-center justify-center rounded-full border transition-[border-color,scale] sm:size-12 ${
                            on ? 'border-accent scale-125' : fixed ? 'border-accent scale-110' : r.level === 3 ? 'border-accent/50' : 'border-line'
                          } ${fixed ? 'shadow-[0_0_0_4px_rgb(158_255_90/0.18),0_0_24px_rgb(158_255_90/0.45)]' : ''}`}
                        >
                          {tag.iconUrl || tag.iconPath ? <TagIcon tag={tag} size={20} /> : <span className="pixel text-dim">{tag.name.slice(0, 2)}</span>}
                        </button>
                      </span>
                    </span>
                  )
                })
              })}
            </div>
          </div>

          <div>
            {/* Lector: el detalle de la habilidad elegida. */}
            <div
              ref={reader}
              className={`bg-surface/60 min-h-[11.5rem] scroll-mb-24 rounded-[1.75rem] border p-5 backdrop-blur-sm transition-colors ${pinned && shown?.id === pinned.id ? 'border-accent/50' : 'border-line'}`}
              aria-live="polite"
            >
              {shown && ring ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex min-w-0 items-center gap-2.5 text-xl font-semibold tracking-tight">
                      <TagIcon tag={shown} size={22} />
                      {shown.name}
                    </p>
                    {pinned?.id === shown.id && (
                      <button type="button" onClick={() => setPinned(null)} className="pixel text-dim hover:text-accent -mt-1 -mr-1 shrink-0 rounded-full px-2 py-2 transition-colors">
                        Soltar
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="flex gap-1" aria-hidden="true">
                      {[1, 2, 3].map((n) => (
                        <span key={n} className={`h-2.5 w-6 ${n <= ring.level ? 'bg-accent' : 'bg-line'}`} />
                      ))}
                    </span>
                    <span className="text-sm">{ring.label.replace(/^Las /, 'La ')}</span>
                  </div>
                  <p className="text-dim mt-2 text-sm">Área: {groupOf(shown)}</p>
                  {shown.projectCount ? (
                    <a href={tagHref(shown)} className="text-accent mt-3 inline-block font-medium underline decoration-1 underline-offset-4">
                      Ver {shown.projectCount === 1 ? 'el proyecto' : `los ${shown.projectCount} proyectos`} con {shown.name}
                    </a>
                  ) : (
                    <p className="text-dim mt-3 text-sm">Todavía sin proyectos publicados.</p>
                  )}
                  {pinned?.id !== shown.id && <p className="pixel text-dim mt-4">Clic para fijarla</p>}
                </>
              ) : (
                <>
                  <p className="pixel text-accent">Sin señal</p>
                  <p className="text-dim mt-3 text-sm leading-relaxed">Elige un planeta para leer qué tecnología es, cuánto la manejo y en qué proyectos la usé.</p>
                </>
              )}
            </div>
            <ul className="mt-5 space-y-2.5 px-1 text-sm">
              {RINGS.map((r) => (
                <li key={r.level} className="flex items-center gap-3">
                  <span className={`size-4 shrink-0 rounded-full border ${r.line}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    {r.label} <span className="text-dim">({r.orbit.toLowerCase()})</span>
                  </span>
                  <span className="pixel text-accent">{all.filter((t) => levelOf(t) === r.level).length}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <dl className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-[minmax(7rem,auto)_minmax(0,1fr)]">
          {groups.map((g) => (
            <div key={g.group} className="contents">
              <dt className="text-dim sm:pt-1.5">{g.group || 'Otras'}</dt>
              <dd className="flex flex-wrap gap-2">
                {g.tags.map((tag) => (
                  <Chip key={tag.id} tag={tag} />
                ))}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
