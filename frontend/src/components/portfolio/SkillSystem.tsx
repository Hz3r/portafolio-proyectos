import { motion } from 'motion/react'
import { useState } from 'react'
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
  const [picked, setPicked] = useState<Tag | null>(null)
  const [paused, setPaused] = useState(false)
  const all = groups.flatMap((g) => g.tags)
  const groupOf = (tag: Tag) => groups.find((g) => g.tags.some((t) => t.id === tag.id))?.group || 'Otras'
  const ring = picked ? RINGS.find((r) => r.level === levelOf(picked)) : null

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-dim max-w-md text-sm">
          {view === 'nivel' ? 'Cuanto más cerca del centro, más la domino. Toca una para ver el detalle.' : 'Las que llevan un número se usan en proyectos publicados: tócalas para verlos.'}
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
              className={`skill-system relative mx-auto aspect-square w-full max-w-[36rem] ${paused || picked ? 'paused' : ''}`}
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => (setPaused(false), setPicked(null))}
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
                  const on = picked?.id === tag.id
                  return (
                    <span
                      key={tag.id}
                      className={`orbit-item ${r.inset} ${ringIndex % 2 ? 'rev' : ''}`}
                      style={{ ['--o' as string]: (i + ringIndex * 0.37) / tags.length, ['--d' as string]: `${r.seconds}s` }}
                    >
                      <span>
                        <button
                          type="button"
                          onMouseEnter={() => setPicked(tag)}
                          onFocus={() => setPicked(tag)}
                          onClick={() => setPicked(tag)}
                          aria-label={`${tag.name}: ${r.label.toLowerCase()}`}
                          aria-pressed={on}
                          className={`bg-bg flex size-10 items-center justify-center rounded-full border transition-[border-color,scale] sm:size-12 ${
                            on ? 'border-accent scale-125' : r.level === 3 ? 'border-accent/50' : 'border-line'
                          }`}
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
            <div className="border-line bg-surface/60 min-h-[9.5rem] rounded-[1.75rem] border p-5 backdrop-blur-sm" aria-live="polite">
              {picked && ring ? (
                <>
                  <p className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
                    <TagIcon tag={picked} size={22} />
                    {picked.name}
                  </p>
                  <p className="text-dim mt-2 text-sm">
                    {ring.label.replace(/^Las /, 'La ')}, en {groupOf(picked)}
                  </p>
                  {picked.projectCount ? (
                    <a href={tagHref(picked)} className="text-accent mt-3 inline-block font-medium underline decoration-1 underline-offset-4">
                      Ver {picked.projectCount === 1 ? 'el proyecto' : `los ${picked.projectCount} proyectos`} con {picked.name}
                    </a>
                  ) : (
                    <p className="text-dim mt-3 text-sm">Todavía sin proyectos publicados.</p>
                  )}
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
