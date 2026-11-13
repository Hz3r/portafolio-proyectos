'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Proyectos', match: (p: string) => p === '/' || p.startsWith('/projects') },
  { href: '/tags', label: 'Etiquetas', match: (p: string) => p.startsWith('/tags') },
  { href: '/skills', label: 'Habilidades', match: (p: string) => p.startsWith('/skills') },
  { href: '/settings', label: 'Ajustes', match: (p: string) => p.startsWith('/settings') },
]

export default function NavLinks() {
  const pathname = usePathname()
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none]" aria-label="Secciones del panel">
      {links.map((l) => {
        const active = l.match(pathname)
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={`shrink-0 rounded-full px-3.5 py-2 text-[0.9375rem] font-medium transition-colors ${
              active ? 'bg-surface text-ink' : 'text-dim hover:text-ink'
            }`}
          >
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
