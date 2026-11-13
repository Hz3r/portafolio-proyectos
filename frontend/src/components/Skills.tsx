import { useState } from 'react'
import type { SkillGroup } from '../lib/api'
import { TagIcon } from './TagBadge'

const FOLD = 8

/** Habilidades agrupadas. Las que tienen proyectos publicados sirven de filtro. */
export default function Skills({ groups, active, onPick }: { groups: SkillGroup[]; active: string; onPick: (tagId: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const total = groups.reduce((n, g) => n + g.tags.length, 0)
  if (total === 0) return null
  const folds = total > FOLD

  return (
    <section aria-labelledby="skills-title" className="border-line bg-surface/60 mb-8 rounded-2xl border backdrop-blur-sm sm:mb-10">
      <div className="flex items-baseline justify-between gap-4 px-5 pt-5 sm:px-6">
        <h2 id="skills-title" className="text-lg font-semibold tracking-tight">
          Habilidades
        </h2>
        <p className="pixel text-dim">
          <span className="text-accent">{total}</span> en total
        </p>
      </div>

      <div className={`relative px-5 pt-4 pb-5 sm:px-6 ${folds && !expanded ? 'max-sm:max-h-48 max-sm:overflow-hidden' : ''}`}>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-[minmax(6rem,auto)_minmax(0,1fr)]">
          {groups.map((g) => (
            <div key={g.group} className="contents">
              <dt className="text-dim text-sm sm:pt-2">{g.group || 'Otras'}</dt>
              <dd className="flex flex-wrap gap-2">
                {g.tags.map((t) => {
                  const on = t.id === active
                  const content = (
                    <>
                      <TagIcon tag={t} size={15} />
                      {t.name}
                      {!!t.projectCount && <span className={`pixel ${on ? '' : 'text-accent'}`}>{t.projectCount}</span>}
                    </>
                  )
                  const base = 'inline-flex items-center gap-2 rounded-full border py-1.5 pr-3 pl-2.5 text-sm'
                  return t.projectCount ? (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => onPick(t.id)}
                      title={`Ver ${t.projectCount} ${t.projectCount === 1 ? 'proyecto' : 'proyectos'} con ${t.name}`}
                      className={`${base} transition-colors ${on ? 'border-accent bg-accent text-bg [&_svg]:fill-current' : 'border-line bg-bg hover:border-accent'}`}
                    >
                      {content}
                    </button>
                  ) : (
                    <span key={t.id} className={`${base} border-line bg-bg`}>
                      {content}
                    </span>
                  )
                })}
              </dd>
            </div>
          ))}
        </dl>
        {folds && !expanded && (
          <div className="from-surface pointer-events-none absolute inset-x-0 bottom-0 h-16 rounded-b-2xl bg-gradient-to-t to-transparent sm:hidden" />
        )}
      </div>

      {folds && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="border-line text-dim hover:text-ink w-full border-t py-3 text-sm font-medium sm:hidden"
        >
          {expanded ? 'Ver menos' : `Ver las ${total} habilidades`}
        </button>
      )}
    </section>
  )
}
