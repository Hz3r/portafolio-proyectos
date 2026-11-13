import { useEffect, useRef } from 'react'
import Sprite, { floats, SPRITE_KINDS, type SpriteKind } from './Sprite'

type Props = {
  /** Qué personajes mostrar; por defecto, todos. */
  kinds?: SpriteKind[]
  /** Cuántos se ven en celular. */
  mobile?: number
  /** Píxeles por segundo. */
  speed?: number
  className?: string
}

/**
 * Personajes que deambulan por su contenedor: eligen un punto al azar, van hacia él,
 * descansan un momento y repiten. Solo decoración; se mueven con transform.
 */
export default function Roamers({ kinds = SPRITE_KINDS, mobile = 4, speed = 26, className = '' }: Props) {
  const layer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = layer.current
    if (!root || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timers = new Set<number>()
    const animations = new Set<Animation>()
    let alive = true

    for (const el of root.querySelectorAll<HTMLElement>('.roamer')) {
      if (getComputedStyle(el).display === 'none') continue
      const face = el.firstElementChild as HTMLElement
      const point = () => ({
        x: Math.random() * Math.max(0, root.clientWidth - el.offsetWidth),
        y: Math.random() * Math.max(0, root.clientHeight - el.offsetHeight),
      })
      let at = point()
      el.style.translate = `${at.x}px ${at.y}px`
      el.style.opacity = '1'

      const wander = () => {
        if (!alive) return
        const to = point()
        const distance = Math.hypot(to.x - at.x, to.y - at.y)
        face.style.scale = to.x < at.x ? '-1 1' : '1 1' // mira hacia donde va
        const animation = el.animate([{ translate: `${at.x}px ${at.y}px` }, { translate: `${to.x}px ${to.y}px` }], {
          duration: Math.max(2500, (distance / speed) * 1000),
          easing: 'ease-in-out',
          fill: 'forwards',
        })
        animations.add(animation)
        animation.onfinish = () => {
          at = to
          el.style.translate = `${to.x}px ${to.y}px`
          animation.cancel()
          animations.delete(animation)
          const rest = window.setTimeout(() => (timers.delete(rest), wander()), 500 + Math.random() * 3000)
          timers.add(rest)
        }
      }
      const start = window.setTimeout(() => (timers.delete(start), wander()), Math.random() * 2500)
      timers.add(start)
    }

    return () => {
      alive = false
      timers.forEach(clearTimeout)
      animations.forEach((a) => a.cancel())
    }
  }, [kinds, speed])

  return (
    <div ref={layer} className={`roamers ${className}`} aria-hidden="true">
      {kinds.map((kind, i) => (
        <span key={kind} className={`roamer ${i >= mobile ? 'max-sm:hidden' : ''}`}>
          <span className="roamer-face">
            <span className={`roamer-body ${floats(kind) ? 'bob' : ''}`} style={{ animationDelay: `${-i * 0.4}s` }}>
              <Sprite kind={kind} size={22} />
            </span>
          </span>
        </span>
      ))}
    </div>
  )
}
