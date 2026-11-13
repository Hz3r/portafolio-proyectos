import { useEffect, useState } from 'react'

const KEY = 'boot-visto'
const BLOCKS = 12

/** Arranque breve tipo consola, solo en la primera visita de la sesión. */
export default function Boot() {
  const [phase, setPhase] = useState<'off' | 'on' | 'out'>('off')

  useEffect(() => {
    let seen = true
    try {
      seen = sessionStorage.getItem(KEY) === '1'
      sessionStorage.setItem(KEY, '1')
    } catch {}
    if (seen || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setPhase('on')
    const out = setTimeout(() => setPhase('out'), 650)
    const off = setTimeout(() => setPhase('off'), 950)
    return () => (clearTimeout(out), clearTimeout(off))
  }, [])

  if (phase === 'off') return null
  return (
    <div
      aria-hidden="true"
      className="bg-bg fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 transition-opacity duration-300"
      style={{ opacity: phase === 'out' ? 0 : 1, pointerEvents: 'none' }}
    >
      <p className="pixel text-accent">Cargando proyectos</p>
      <div className="flex gap-1">
        {Array.from({ length: BLOCKS }, (_, i) => (
          <span
            key={i}
            className="bg-accent h-3 w-2"
            style={{ animation: `rise 0.01s steps(1) both`, animationDelay: `${i * 45}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
