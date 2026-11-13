import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { JourneyItem } from '../../lib/api'
import Sprite from '../Sprite'

const KIND: Record<JourneyItem['kind'], string> = { WORK: 'Trabajo', EDUCATION: 'Formación', CERT: 'Certificación', MILESTONE: 'Logro' }
type Geo = { w: number; h: number; d: string; nodes: { x: number; y: number }[] }
const BOT = 22
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * La trayectoria como un camino: una curva que serpentea entre las etapas.
 * Al bajar, el camino se va trazando y un robot lo recorre hasta donde estás leyendo.
 */
export default function Journey({ items }: { items: JourneyItem[] }) {
  const root = useRef<HTMLOListElement>(null)
  const lane = useRef<HTMLDivElement>(null)
  const trace = useRef<SVGPathElement>(null)
  const bot = useRef<HTMLSpanElement>(null)
  const [geo, setGeo] = useState<Geo | null>(null)

  // El camino pasa por la altura de cada etapa, alternando de lado.
  useIsoLayoutEffect(() => {
    const list = root.current
    const strip = lane.current
    if (!list || !strip) return
    const measure = () => {
      const w = strip.clientWidth
      const h = list.clientHeight
      const wide = w > 60
      const edge = wide ? 16 : 9
      const nodes = [...list.querySelectorAll<HTMLElement>('[data-stage]')].map((el, i) => ({
        x: i % 2 === 0 ? edge : w - edge,
        y: el.offsetTop + 13,
      }))
      const points = [{ x: w / 2, y: 0 }, ...nodes, { x: w / 2, y: h }]
      const d = points
        .map((p, i) => {
          if (i === 0) return `M${p.x} ${p.y}`
          const a = points[i - 1]
          const bend = (p.y - a.y) / 2
          return `C${a.x} ${a.y + bend},${p.x} ${p.y - bend},${p.x} ${p.y}`
        })
        .join('')
      setGeo((g) => (g && g.d === d && g.h === h ? g : { w, h, d, nodes }))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [items])

  useEffect(() => {
    const list = root.current
    const path = trace.current
    const walker = bot.current
    if (!geo || !list || !path || !walker) return
    const total = path.getTotalLength()
    path.style.strokeDasharray = `${total}`
    const dots = [...list.querySelectorAll<SVGCircleElement>('[data-dot]')]
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    let last = { x: geo.w / 2, y: 0 }
    let resting = 0

    const update = () => {
      // Hasta dónde se ha leído: la línea al 55 % de la pantalla.
      const reach = still ? geo.h : Math.min(geo.h, Math.max(0, innerHeight * 0.55 - list.getBoundingClientRect().top))
      // El camino siempre baja, así que se busca por bisección el punto a esa altura.
      let lo = 0
      let hi = total
      for (let i = 0; i < 14; i++) {
        const mid = (lo + hi) / 2
        if (path.getPointAtLength(mid).y < reach) lo = mid
        else hi = mid
      }
      const at = path.getPointAtLength(lo)
      path.style.strokeDashoffset = `${total - lo}`
      for (const dot of dots) dot.classList.toggle('on', Number(dot.getAttribute('cy')) <= at.y + 1)
      walker.style.translate = `${at.x - BOT / 2}px ${at.y - BOT - 4}px`
      walker.style.opacity = still || reach <= 0 || reach >= geo.h ? '0' : '1'
      if (Math.abs(at.x - last.x) > 0.5) walker.style.setProperty('--face', at.x < last.x ? '-1' : '1')
      if (at.y !== last.y) {
        walker.classList.add('moving')
        clearTimeout(resting)
        resting = window.setTimeout(() => walker.classList.remove('moving'), 160)
      }
      last = { x: at.x, y: at.y }
    }
    update()
    addEventListener('scroll', update, { passive: true })
    addEventListener('resize', update)
    return () => {
      removeEventListener('scroll', update)
      removeEventListener('resize', update)
      clearTimeout(resting)
    }
  }, [geo])

  return (
    <ol ref={root} className="relative space-y-12 pb-6 sm:space-y-16">
      <div ref={lane} className="pointer-events-none absolute inset-y-0 left-0 w-10 lg:left-1/2 lg:w-28 lg:-translate-x-1/2" aria-hidden="true">
        {geo && (
          <svg width={geo.w} height={geo.h} className="absolute inset-0 overflow-visible" fill="none">
            <path d={geo.d} className="stroke-line" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />
            <path ref={trace} d={geo.d} className="journey-trace" strokeWidth="2" strokeLinecap="round" />
            {geo.nodes.map((n, i) => (
              <circle key={i} data-dot cx={n.x} cy={n.y} r="5" className="journey-dot" strokeWidth="2" />
            ))}
          </svg>
        )}
        <span ref={bot} className="walker absolute top-0 left-0 opacity-0">
          <Sprite kind="robot" size={BOT} />
        </span>
      </div>

      {items.map((item, i) => (
        <li key={item.id} data-stage className="pl-14 lg:grid lg:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] lg:pl-0">
          <div className={i % 2 === 0 ? 'lg:col-start-1 lg:pr-4 lg:text-right' : 'lg:col-start-3 lg:pl-4'}>
            <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${i % 2 === 0 ? 'lg:justify-end' : ''}`}>
              {item.period && <span className="pixel text-accent">{item.period}</span>}
              <span className="text-dim text-sm">{KIND[item.kind]}</span>
            </p>
            <h3 className="mt-2.5 text-xl font-semibold tracking-tight text-balance sm:text-2xl">{item.title}</h3>
            {item.place &&
              (item.url ? (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-dim hover:text-accent mt-1 inline-block underline decoration-1 underline-offset-4 transition-colors">
                  {item.place}
                </a>
              ) : (
                <p className="text-dim mt-1">{item.place}</p>
              ))}
            {item.text && <p className={`text-ink/80 mt-3 max-w-[52ch] leading-relaxed text-pretty whitespace-pre-line ${i % 2 === 0 ? 'lg:ml-auto' : ''}`}>{item.text}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}
