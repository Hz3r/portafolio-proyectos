import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { ROUTES } from '../../lib/api'
import Sprite from '../Sprite'

type Link = { id: string; label: string }

/** Barra flotante del portafolio: salta entre secciones y marca en cuál estás. */
export default function Nav({ name, links }: { name: string; links: Link[] }) {
  const [active, setActive] = useState('')

  useEffect(() => {
    const update = () => {
      const line = innerHeight * 0.35
      let current = ''
      for (const { id } of links) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= line) current = id
      }
      setActive(current)
    }
    update()
    addEventListener('scroll', update, { passive: true })
    return () => removeEventListener('scroll', update)
  }, [links])

  // En celular la sección activa queda a la vista dentro de la barra.
  useEffect(() => {
    document.querySelector(`[data-nav="${active}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [active])

  return (
    <nav
      aria-label="Secciones del portafolio"
      className="border-line bg-bg/75 fixed inset-x-3 top-3 z-30 mx-auto flex w-fit max-w-[calc(100vw-1.5rem)] items-center gap-1 rounded-full border p-1.5 backdrop-blur-md"
    >
      <a href="#inicio" className="hover:text-accent flex shrink-0 items-center gap-2 rounded-full py-1.5 pr-3 pl-2.5 font-semibold tracking-tight transition-colors max-sm:hidden">
        <Sprite kind="robot" size={18} />
        {name}
      </a>
      <ul className="flex min-w-0 items-center overflow-x-auto [scrollbar-width:none]">
        {links.map((l) => {
          const on = l.id === active
          return (
            <li key={l.id} className="shrink-0">
              <a
                href={`#${l.id}`}
                data-nav={l.id}
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
      <a href={ROUTES.projects} className="bg-accent text-bg shrink-0 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap">
        Solo proyectos
      </a>
    </nav>
  )
}
