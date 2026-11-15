import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { ROUTES } from '../../lib/api'
import Sprite from '../Sprite'

type Link = { id: string; label: string }

// Con muchas secciones, estas quedan a la vista y el resto va en "Más".
const PRIMARY = ['sobre-mi', 'habilidades', 'proyectos', 'contacto']
const MAX_INLINE = 5

/** Barra flotante del portafolio: salta entre secciones y marca en cuál estás. */
export default function Nav({ name, links }: { name: string; links: Link[] }) {
  const [active, setActive] = useState('')
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLElement>(null)

  const inline = links.length <= MAX_INLINE ? links : links.filter((l) => PRIMARY.includes(l.id))
  const extra = links.filter((l) => !inline.includes(l))
  const current = links.find((l) => l.id === active)
  const currentExtra = extra.find((l) => l.id === active)

  useEffect(() => {
    const update = () => {
      const line = innerHeight * 0.35
      let found = ''
      for (const { id } of links) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= line) found = id
      }
      setActive(found)
    }
    update()
    addEventListener('scroll', update, { passive: true })
    return () => removeEventListener('scroll', update)
  }, [links])

  // El menú se cierra con Escape o al tocar fuera.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  return (
    <nav
      ref={root}
      aria-label="Secciones del portafolio"
      className="border-line bg-bg/75 fixed inset-x-3 top-3 z-30 mx-auto flex w-fit max-w-[calc(100vw-1.5rem)] items-center gap-1 rounded-full border p-1.5 backdrop-blur-md"
    >
      <a href="#inicio" className="hover:text-accent flex min-w-0 shrink items-center gap-2 rounded-full py-1.5 pr-3 pl-2.5 font-semibold tracking-tight transition-colors">
        <Sprite kind="robot" size={18} />
        <span className="truncate max-sm:hidden">{name}</span>
      </a>

      {/* Pantallas grandes: las secciones principales a la vista. */}
      <ul className="flex items-center max-lg:hidden">
        {inline.map((l) => {
          const on = l.id === active
          return (
            <li key={l.id}>
              <a
                href={`#${l.id}`}
                aria-current={on ? 'true' : undefined}
                className={`relative block rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${on ? 'text-ink' : 'text-dim hover:text-ink'}`}
              >
                {on && <motion.span layoutId="nav-pill" className="bg-surface border-line absolute inset-0 rounded-full border" transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} />}
                <span className="relative">{l.label}</span>
              </a>
            </li>
          )
        })}
      </ul>

      {/* Menú: en pantallas grandes guarda las secciones secundarias; en las demás, todas. */}
      <div className={`relative ${extra.length ? '' : 'lg:hidden'}`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="true"
          className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
            open ? 'bg-surface text-ink' : 'text-dim hover:text-ink'
          } ${currentExtra ? 'lg:text-ink' : ''} ${current ? 'max-lg:text-ink' : ''}`}
        >
          <span className="lg:hidden">{current?.label ?? 'Secciones'}</span>
          <span className="max-lg:hidden">{currentExtra?.label ?? 'Más'}</span>
          <svg width="8" height="6" viewBox="0 0 8 6" fill="currentColor" shapeRendering="crispEdges" className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">
            <path d="M0 0h8v2H6v2H5v2H3V4H2V2H0z" />
          </svg>
        </button>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16 }}
            className="border-line bg-surface absolute top-[calc(100%+0.75rem)] left-1/2 w-52 -translate-x-1/2 rounded-2xl border p-1.5 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9)] lg:left-auto lg:right-0 lg:translate-x-0"
          >
            {links.map((l) => {
              const on = l.id === active
              return (
                <li key={l.id} className={inline.includes(l) ? 'lg:hidden' : ''}>
                  <a
                    href={`#${l.id}`}
                    onClick={() => setOpen(false)}
                    aria-current={on ? 'true' : undefined}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${on ? 'bg-bg text-ink' : 'text-dim hover:text-ink'}`}
                  >
                    {l.label}
                    {on && <span className="bg-accent size-1.5" aria-hidden="true" />}
                  </a>
                </li>
              )
            })}
          </motion.ul>
        )}
      </div>

      <a href={ROUTES.projects} className="bg-accent text-bg shrink-0 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap">
        Solo proyectos
      </a>
    </nav>
  )
}
