import { AnimatePresence } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { Tag } from '../lib/api'
import Sprite from './Sprite'
import Sheet from './Sheet'
import { TagIcon } from './TagBadge'

export const ALL = '__todos__'
const TOP = 5

type Counted = { tag: Tag; count: number }

/** Filtros: los más usados a la vista; el resto, en un panel con buscador. */
export default function FilterBar({ tags, active, onChange }: { tags: Counted[]; active: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const row = useRef<HTMLUListElement>(null)
  const bot = useRef<HTMLLIElement>(null)
  const hop = useRef<HTMLSpanElement>(null)

  // A la vista: los primeros, más el activo si quedó fuera.
  const top = tags.slice(0, TOP)
  const extra = tags.find((t) => t.tag.id === active && !top.includes(t))
  const shown = extra ? [...top, extra] : top
  const hidden = tags.length - top.length

  // La mascota salta de filtro en filtro, y al que elijas.
  useEffect(() => {
    const el = bot.current
    const list = row.current
    if (!el || !list) return
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    let x = 0
    const land = (chip: HTMLElement, animate: boolean) => {
      const to = chip.offsetLeft + chip.offsetWidth / 2 - el.offsetWidth / 2
      if (animate && !still) {
        const distance = Math.abs(to - x)
        const duration = Math.min(900, 380 + distance * 1.6)
        el.animate([{ translate: `${x}px 0` }, { translate: `${to}px 0` }], { duration, easing: 'linear', fill: 'forwards' })
        hop.current?.animate(
          [
            { translate: '0 0', easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)' },
            { translate: `0 -${Math.min(34, 14 + distance / 8)}px`, easing: 'cubic-bezier(0.6, 0, 0.8, 0.2)' },
            { translate: '0 0' },
          ],
          { duration },
        )
      } else {
        el.style.translate = `${to}px 0`
      }
      x = to
    }
    const chips = () => [...list.querySelectorAll<HTMLElement>('[data-chip]')]
    const current = () => chips().find((c) => c.dataset.chip === active) ?? chips()[0]
    if (current()) land(current(), false)
    el.style.opacity = '1'

    if (still) return
    let visible = true
    const observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting))
    observer.observe(list)
    // Pasea solo cada pocos segundos mientras la barra está a la vista.
    const timer = setInterval(() => {
      if (!visible || document.hidden) return
      const options = chips().filter((c) => {
        const center = c.offsetLeft + c.offsetWidth / 2
        return Math.abs(center - el.offsetWidth / 2 - x) > 4 && center > list.scrollLeft && center < list.scrollLeft + list.clientWidth
      })
      const next = options[Math.floor(Math.random() * options.length)]
      if (next) land(next, true)
    }, 3400)
    return () => (clearInterval(timer), observer.disconnect())
  }, [active, shown.length])

  const q = query.trim().toLowerCase()
  const found = tags.filter((t) => !q || t.tag.name.toLowerCase().includes(q))
  const chip = (on: boolean) =>
    `flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
      on ? 'border-accent bg-accent text-bg' : 'border-line text-dim hover:border-dim hover:text-ink'
    }`

  return (
    <nav aria-label="Filtrar por etiqueta" className="-mx-5 mb-8 sm:mx-0 sm:mb-10">
      <ul ref={row} className="relative flex gap-2 overflow-x-auto px-5 pt-8 pb-1 [scrollbar-width:none] sm:px-0">
        <li ref={bot} className="pointer-events-none absolute top-0 left-0 opacity-0 transition-opacity duration-500" aria-hidden="true">
          <span ref={hop} className="block">
            <Sprite kind="robot" />
          </span>
        </li>
        <li>
          <button type="button" data-chip={ALL} aria-pressed={active === ALL} onClick={() => onChange(ALL)} className={chip(active === ALL)}>
            Todos
          </button>
        </li>
        {shown.map(({ tag }) => {
          const on = tag.id === active
          return (
            <li key={tag.id}>
              <button type="button" data-chip={tag.id} aria-pressed={on} onClick={() => onChange(tag.id)} className={chip(on)}>
                {(tag.iconPath || tag.iconUrl) && (
                  <span className={on && !tag.iconUrl ? '[&_svg]:fill-current' : ''}>
                    <TagIcon tag={tag} />
                  </span>
                )}
                {tag.name}
              </button>
            </li>
          )
        })}
        {hidden > 0 && (
          <li>
            <button type="button" onClick={() => setOpen(true)} className={`${chip(false)} border-dashed`} aria-haspopup="dialog">
              Más filtros <span className="pixel text-accent">+{hidden}</span>
            </button>
          </li>
        )}
      </ul>

      <AnimatePresence>
        {open && (
          <Sheet label="Todos los filtros" onClose={() => setOpen(false)}>
            <div className="border-line border-b p-5 pr-28">
              <h2 className="text-lg font-semibold">Filtrar proyectos</h2>
              <input
                className="border-line bg-bg focus:border-accent mt-4 w-full rounded-full border px-4 py-2.5 outline-none"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Buscar entre ${tags.length} etiquetas`}
                aria-label="Buscar etiqueta"
              />
            </div>
            <ul className="flex flex-wrap content-start gap-2 overflow-y-auto overscroll-contain p-5">
              {!q && (
                <li>
                  <button type="button" aria-pressed={active === ALL} onClick={() => (onChange(ALL), setOpen(false))} className={chip(active === ALL)}>
                    Todos
                  </button>
                </li>
              )}
              {found.map(({ tag, count }) => {
                const on = tag.id === active
                return (
                  <li key={tag.id}>
                    <button type="button" aria-pressed={on} onClick={() => (onChange(tag.id), setOpen(false))} className={chip(on)}>
                      {(tag.iconPath || tag.iconUrl) && (
                        <span className={on && !tag.iconUrl ? '[&_svg]:fill-current' : ''}>
                          <TagIcon tag={tag} />
                        </span>
                      )}
                      {tag.name}
                      <span className={`pixel ${on ? '' : 'text-dim'}`}>{count}</span>
                    </button>
                  </li>
                )
              })}
              {found.length === 0 && <li className="text-dim py-6 text-sm">Ninguna etiqueta coincide con “{query.trim()}”.</li>}
            </ul>
          </Sheet>
        )}
      </AnimatePresence>
    </nav>
  )
}
