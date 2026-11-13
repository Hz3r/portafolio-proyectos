'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Iconos pixel: rectángulos [x, y, ancho, alto] en una rejilla de 16.
const px = (rects: number[][]) => rects.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h-${w}z`).join('')
const links = [
  { href: '/', label: 'Resumen', icon: px([[1, 1, 6, 8], [9, 1, 6, 4], [9, 7, 6, 8], [1, 11, 6, 4]]), match: (p: string) => p === '/' },
  { href: '/portfolio', label: 'Portafolio', icon: px([[5, 1, 6, 6], [2, 9, 12, 2], [2, 11, 2, 4], [12, 11, 2, 4]]), match: (p: string) => p.startsWith('/portfolio') },
  { href: '/projects', label: 'Proyectos', icon: px([[1, 2, 14, 2], [1, 4, 2, 10], [13, 4, 2, 10], [1, 12, 14, 2], [5, 6, 6, 4]]), match: (p: string) => p.startsWith('/projects') },
  { href: '/skills', label: 'Habilidades', icon: px([[6, 1, 4, 3], [4, 6, 8, 3], [1, 11, 14, 3]]), match: (p: string) => p.startsWith('/skills') },
  { href: '/tags', label: 'Etiquetas', icon: px([[1, 1, 7, 2], [1, 3, 2, 5], [8, 3, 2, 2], [10, 5, 2, 2], [12, 7, 2, 2], [10, 9, 2, 2], [8, 11, 2, 2], [6, 13, 2, 2], [4, 11, 2, 2], [2, 9, 2, 2], [4, 4, 2, 2]]), match: (p: string) => p.startsWith('/tags') },
  { href: '/settings', label: 'Ajustes', icon: px([[1, 3, 14, 2], [9, 1, 2, 6], [1, 11, 14, 2], [4, 9, 2, 6]]), match: (p: string) => p.startsWith('/settings') },
]

/** Navegación del panel: columna en escritorio, fila deslizable en celular. */
export default function NavLinks() {
  const pathname = usePathname()
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0" aria-label="Secciones del panel">
      {links.map((l) => {
        const active = l.match(pathname)
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-full px-3.5 py-2 text-[0.9375rem] font-medium transition-colors lg:rounded-xl lg:py-2.5 ${
              active ? 'bg-surface text-ink' : 'text-dim hover:text-ink'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" shapeRendering="crispEdges" className={`shrink-0 max-lg:hidden ${active ? 'text-accent' : ''}`} aria-hidden="true">
              <path d={l.icon} />
            </svg>
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
