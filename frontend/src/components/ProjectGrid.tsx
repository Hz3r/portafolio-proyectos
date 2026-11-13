import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import type { Project } from '../lib/api'
import { pad } from '../lib/api'
import Cover from './Cover'

const ALL = 'Todos'

export default function ProjectGrid({ projects }: { projects: Project[] }) {
  const [tag, setTag] = useState(ALL)
  // Tras el primer cambio de filtro la entrada escalonada ya no debe repetirse.
  const [touched, setTouched] = useState(false)

  const tags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of projects) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)
  }, [projects])

  const visible = tag === ALL ? projects : projects.filter((p) => p.tags.includes(tag))

  return (
    <main>
      {tags.length > 1 && (
        <nav aria-label="Filtrar por etiqueta" className="-mx-5 mb-8 overflow-x-auto px-5 sm:mx-0 sm:mb-10 sm:px-0">
          <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
            {[ALL, ...tags].map((t) => {
              const active = t === tag
              return (
                <li key={t}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => (setTag(t), setTouched(true))}
                    className={`pixel rounded-full border px-3.5 py-2.5 transition-colors ${
                      active
                        ? 'border-accent bg-accent text-bg'
                        : 'border-line text-dim hover:border-dim hover:text-ink'
                    }`}
                  >
                    {t}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      )}

      <ul className="grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((p, i) => (
            <motion.li
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <a
                href={`/p/${p.slug}`}
                className="card"
                style={{ ['--i' as string]: Math.min(i, 8), animation: touched ? 'none' : undefined }}
              >
                <div className="select-frame">
                  <div
                    className="bg-surface border-line aspect-[16/10] overflow-hidden rounded-2xl border"
                    style={{ viewTransitionName: `cover-${p.id}` }}
                  >
                    <Cover project={p} eager={i < 2} />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-3">
                  <span className="pixel text-accent">{pad(projects.indexOf(p) + 1)}</span>
                  <h2 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">
                    <span className="pointer" aria-hidden="true">
                      ▶
                    </span>
                    {p.title}
                  </h2>
                </div>
                {p.summary && <p className="text-dim mt-1.5 line-clamp-2 leading-snug">{p.summary}</p>}
                <div className="pixel text-dim mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                  {p.tags.slice(0, 3).map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                  {p.year && <span>{p.year}</span>}
                  {!p.url && (
                    <span className="border-line ml-auto flex items-center gap-1.5 rounded-full border px-2 py-1.5">
                      <Lock /> Privado
                    </span>
                  )}
                </div>
              </a>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </main>
  )
}

export function Lock() {
  return (
    <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
      <path d="M2 0h4v1h1v3h1v6H0V4h1V1h1zm0 2v2h4V2z" />
    </svg>
  )
}
