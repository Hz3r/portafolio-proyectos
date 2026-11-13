import { useEffect, useState } from 'react'

type Chapter = { id: string; title: string }

/** Índice de capítulos: barra deslizable en móvil, columna fija en escritorio. */
export default function ChapterNav({ chapters }: { chapters: Chapter[] }) {
  const [active, setActive] = useState(chapters[0]?.id)

  useEffect(() => {
    const targets = chapters.flatMap((c) => document.getElementById(c.id) ?? [])
    // Activo = el último capítulo cuyo inicio ya pasó el tercio superior de la pantalla.
    const update = () => {
      const line = window.innerHeight * 0.35
      const current = targets.filter((el) => el.getBoundingClientRect().top <= line).at(-1) ?? targets[0]
      if (current) setActive(current.id)
    }
    update()
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => (window.removeEventListener('scroll', onScroll), cancelAnimationFrame(frame))
  }, [chapters])

  return (
    <nav aria-label="Capítulos" className="chapter-nav">
      <ol>
        {chapters.map((c, i) => {
          const on = c.id === active
          return (
            <li key={c.id}>
              <a href={`#${c.id}`} aria-current={on ? 'true' : undefined} className={on ? 'on' : ''}>
                <span className="pixel">{String(i + 1).padStart(2, '0')}</span>
                {c.title}
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
