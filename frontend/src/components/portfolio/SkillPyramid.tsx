import { motion } from 'motion/react'
import { useState } from 'react'
import { type SkillGroup, type Tag, tagHref } from '../../lib/api'
import { TagIcon } from '../TagBadge'

const TIERS = [
  { level: 3, label: 'Las domino', width: 'lg:max-w-[54%]', tone: 'border-accent/60 bg-accent/[0.07]' },
  { level: 2, label: 'Las uso con soltura', width: 'lg:max-w-[78%]', tone: 'border-line bg-surface/70' },
  { level: 1, label: 'Las estoy aprendiendo', width: 'lg:max-w-full', tone: 'border-line border-dashed bg-surface/30' },
]
type View = 'nivel' | 'area'

/** Una habilidad. Si tiene proyectos publicados, lleva a verlos ya filtrados. */
function Skill({ tag }: { tag: Tag }) {
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
    <a
      href={tagHref(tag)}
      title={`Ver ${tag.projectCount} ${tag.projectCount === 1 ? 'proyecto' : 'proyectos'} con ${tag.name}`}
      className={`${base} hover:border-accent transition-colors`}
    >
      <TagIcon tag={tag} size={15} />
      {tag.name}
      <span className="pixel text-accent">{tag.projectCount}</span>
    </a>
  )
}

/** Habilidades como pirámide por nivel de dominio, o agrupadas por área. */
export default function SkillPyramid({ groups }: { groups: SkillGroup[] }) {
  const [view, setView] = useState<View>('nivel')
  const all = groups.flatMap((g) => g.tags)
  const tiers = TIERS.map((t) => ({ ...t, tags: all.filter((s) => (s.skillLevel ?? 2) === t.level) })).filter((t) => t.tags.length)
  const linked = all.some((t) => t.projectCount)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-dim max-w-md text-sm">
          {linked ? 'Las que llevan un número se usan en proyectos publicados: tócalas para verlos.' : `${all.length} tecnologías con las que trabajo.`}
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
        <ol className="mt-8 space-y-3">
          {tiers.map((t) => (
            <li key={t.level} className={`mx-auto rounded-[2.25rem] border px-6 py-5 text-center sm:px-8 ${t.width} ${t.tone}`}>
              <h3 className="text-dim text-sm">{t.label}</h3>
              <ul className="mt-3 flex flex-wrap justify-center gap-2">
                {t.tags.map((tag) => (
                  <li key={tag.id}>
                    <Skill tag={tag} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      ) : (
        <dl className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-[minmax(7rem,auto)_minmax(0,1fr)]">
          {groups.map((g) => (
            <div key={g.group} className="contents">
              <dt className="text-dim sm:pt-1.5">{g.group || 'Otras'}</dt>
              <dd className="flex flex-wrap gap-2">
                {g.tags.map((tag) => (
                  <Skill key={tag.id} tag={tag} />
                ))}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
