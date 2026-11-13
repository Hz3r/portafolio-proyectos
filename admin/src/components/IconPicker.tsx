'use client'

import { useEffect, useRef, useState } from 'react'
import { searchIcons } from '@/app/actions'
import type { IconHit } from '@/lib/icons'
import { TagIcon } from './ui'

/** Buscador de iconos sobre toda la librería. Antes de escribir muestra los destacados. */
export default function IconPicker({
  featured,
  total,
  selected,
  onPick,
}: {
  featured: IconHit[]
  total: number
  selected: string | null
  onPick: (hit: IconHit) => void
}) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState(featured)
  const [loading, setLoading] = useState(false)
  const latest = useRef(0)

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setHits(featured)
      setLoading(false)
      return
    }
    setLoading(true)
    const id = ++latest.current
    const timer = setTimeout(async () => {
      const found = await searchIcons(q).catch(() => [])
      // Solo se aplica la respuesta de la última búsqueda.
      if (id === latest.current) {
        setHits(found)
        setLoading(false)
      }
    }, 180)
    return () => clearTimeout(timer)
  }, [query, featured])

  return (
    <div>
      <input
        className="field !bg-bg !rounded-full !py-2"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Buscar entre ${total.toLocaleString('es')} iconos: react, docker, python…`}
        aria-label="Buscar icono"
      />
      <ul className="border-line bg-bg mt-2 grid max-h-56 grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-1 overflow-y-auto rounded-xl border p-2" aria-busy={loading}>
        {hits.map((hit) => {
          const active = selected === hit.iconPath
          return (
            <li key={hit.name + hit.iconPath.length}>
              <button
                type="button"
                title={hit.name}
                aria-pressed={active}
                onClick={() => onPick(hit)}
                className={`flex w-full flex-col items-center gap-1.5 rounded-lg px-1 py-2.5 ${active ? 'bg-accent/15 ring-accent ring-1' : 'hover:bg-surface'}`}
              >
                <TagIcon tag={{ iconPath: hit.iconPath, iconUrl: null, color: hit.color }} size={20} />
                <span className="text-dim w-full truncate text-center text-[0.6875rem] leading-tight">{hit.name}</span>
              </button>
            </li>
          )
        })}
        {hits.length === 0 && (
          <li className="text-dim col-span-full px-2 py-6 text-center text-sm">
            {loading ? 'Buscando…' : 'Ningún icono coincide. Prueba otro nombre o sube tu propia imagen.'}
          </li>
        )}
      </ul>
    </div>
  )
}
