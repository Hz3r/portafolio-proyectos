import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import type { Owner, Project, SkillGroup, Tag } from '../lib/api'
import { pad } from '../lib/api'
import Cover from './Cover'
import FilterBar, { ALL } from './FilterBar'
import QuickView from './QuickView'
import Skills from './Skills'
import TagBadge from './TagBadge'

export default function ProjectGrid({ projects, skills, owner }: { projects: Project[]; skills: SkillGroup[]; owner: Owner }) {
  const [tag, setTag] = useState(ALL)
  const [quick, setQuick] = useState<Project | null>(null)
  // Tras el primer cambio de filtro la entrada escalonada ya no debe repetirse.
  const [touched, setTouched] = useState(false)

  // Etiquetas ordenadas por cuántos proyectos las usan.
  const tags = useMemo(() => {
    const seen = new Map<string, { tag: Tag; count: number }>()
    for (const p of projects)
      for (const t of p.tags) {
        const entry = seen.get(t.id)
        if (entry) entry.count++
        else seen.set(t.id, { tag: t, count: 1 })
      }
    return [...seen.values()].sort((a, b) => b.count - a.count)
  }, [projects])

  const visible = tag === ALL ? projects : projects.filter((p) => p.tags.some((t) => t.id === tag))

  // Un clic normal abre la vista rápida; con Ctrl/⌘ o botón central, el enlace de siempre.
  const open = (e: React.MouseEvent, p: Project) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    setQuick(p)
  }

  return (
    <main>
      <Skills
        groups={skills}
        active={tag}
        onPick={(id) => {
          setTag(id === tag ? ALL : id)
          setTouched(true)
          document.getElementById('proyectos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
      />

      <div id="proyectos" className="scroll-mt-4" />
      {tags.length > 1 && <FilterBar tags={tags} active={tag} onChange={(id) => (setTag(id), setTouched(true))} />}

      <ul className="grid grid-cols-1 gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((p, i) => (
            <motion.li
              key={p.id}
              layout
              className="min-w-0"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <a
                href={`/p/${p.slug}`}
                onClick={(e) => open(e, p)}
                aria-haspopup="dialog"
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
                <div className="mt-3.5 flex flex-wrap items-center gap-x-3.5 gap-y-2">
                  {p.tags.slice(0, 3).map((t) => (
                    <TagBadge key={t.id} tag={t} plain />
                  ))}
                  {p.tags.length > 3 && <span className="pixel text-dim">+{p.tags.length - 3}</span>}
                  {p.year && <span className="pixel text-dim">{p.year}</span>}
                  {!p.url && (
                    <span className="pixel text-dim border-line ml-auto flex items-center gap-1.5 rounded-full border px-2 py-1.5">
                      <Lock /> Privado
                    </span>
                  )}
                </div>
              </a>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {visible.length === 0 && (
        <p className="border-line text-dim rounded-2xl border border-dashed px-6 py-14 text-center">
          Ningún proyecto publicado usa esta etiqueta todavía.
        </p>
      )}

      <AnimatePresence>
        {quick && <QuickView project={quick} owner={owner} number={projects.indexOf(quick) + 1} onClose={() => setQuick(null)} />}
      </AnimatePresence>
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
