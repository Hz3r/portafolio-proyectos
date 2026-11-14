import { useEffect, useMemo, useRef, useState } from 'react'
import type { ContributionDay, Contributions } from '../../lib/api'
import Window, { useOs } from './Window'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const SHADE = ['bg-[#15151f]', 'bg-accent/25', 'bg-accent/45', 'bg-accent/70', 'bg-accent']
const utc = (date: string) => new Date(`${date}T00:00:00Z`)
const long = (date: string) => {
  const d = utc(date)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}
const plural = (n: number, one: string, many: string) => `${n.toLocaleString('es')} ${n === 1 ? one : many}`

/** Calendario de contribuciones de GitHub del último año, dentro de una ventana de terminal. */
export default function Activity({ data }: { data: Contributions }) {
  const [os] = useOs()
  const [hover, setHover] = useState<ContributionDay | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  const { weeks, months, streak, longest, best, activeDays } = useMemo(() => {
    // Columnas por semana, de domingo a sábado; la primera puede empezar a media semana.
    const weeks: (ContributionDay | null)[][] = []
    for (const day of data.days) {
      const weekday = utc(day.date).getUTCDay()
      if (weeks.length === 0 || weekday === 0) weeks.push(Array(7).fill(null))
      weeks[weeks.length - 1][weekday] = day
    }
    const months: { index: number; label: string }[] = []
    weeks.forEach((week, index) => {
      const first = week.find((d) => d)
      if (!first) return
      const month = utc(first.date).getUTCMonth()
      const previous = months[months.length - 1]
      if (!previous || (previous.label !== MONTHS[month] && index - previous.index >= 3)) months.push({ index, label: MONTHS[month] })
    })

    let longest = 0
    let run = 0
    for (const d of data.days) {
      run = d.count > 0 ? run + 1 : 0
      longest = Math.max(longest, run)
    }
    // La racha actual sigue viva aunque hoy todavía no haya nada.
    const reversed = [...data.days].reverse()
    const start = reversed[0]?.count === 0 ? 1 : 0
    let streak = 0
    for (const d of reversed.slice(start)) {
      if (d.count === 0) break
      streak++
    }
    const best = data.days.reduce<ContributionDay | null>((top, d) => (d.count > (top?.count ?? 0) ? d : top), null)
    return { weeks, months, streak, longest, best, activeDays: data.days.filter((d) => d.count > 0).length }
  }, [data])

  // En pantallas estrechas el calendario se desliza: empieza mostrando lo más reciente.
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])

  const prompt = os === 'windows' ? `PS C:\\Users\\${data.user}>` : os === 'linux' ? `${data.user}@github:~$` : `${data.user}@github ~ %`
  const stats = [
    { value: data.total.toLocaleString('es'), label: 'contribuciones en el último año' },
    { value: plural(streak, 'día', 'días'), label: 'racha actual' },
    { value: plural(longest, 'día', 'días'), label: 'racha más larga' },
    { value: activeDays.toLocaleString('es'), label: 'días con actividad' },
  ]

  return (
    <Window os={os} title={`github.com/${data.user}: contribuciones`}>
      <div className="p-5 font-mono text-sm sm:p-7">
        <p className="text-dim truncate">
          <span className="text-accent">{prompt}</span> git log --since="hace 1 año" --author={data.user} | calendario
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <dd className="font-sans text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{s.value}</dd>
              <dt className="text-dim mt-1 font-sans text-sm">{s.label}</dt>
            </div>
          ))}
        </dl>

        <div ref={scroller} className="-mx-5 mt-7 overflow-x-auto px-5 pb-1 [scrollbar-width:thin] sm:-mx-7 sm:px-7">
          <div className="grid w-max grid-cols-[auto_1fr] gap-x-2 gap-y-1.5 lg:w-full">
            <div />
            <div className="text-dim relative h-4 text-xs" aria-hidden="true">
              {months.map((m) => (
                <span key={m.index} className="absolute" style={{ left: `${(m.index / weeks.length) * 100}%` }}>
                  {m.label}
                </span>
              ))}
            </div>
            <div className="text-dim grid grid-rows-7 gap-[3px] text-xs leading-none" aria-hidden="true">
              {['', 'lun', '', 'mié', '', 'vie', ''].map((d, i) => (
                <span key={i} className="flex items-center">
                  {d}
                </span>
              ))}
            </div>
            <div
              role="img"
              aria-label={`${data.total} contribuciones en GitHub en el último año. Racha más larga: ${longest} días.`}
              className="grid grid-flow-col grid-rows-7 gap-[3px] max-lg:auto-cols-[11px] lg:auto-cols-fr"
              onMouseLeave={() => setHover(null)}
            >
              {weeks.flatMap((week, w) =>
                week.map((day, d) =>
                  day ? (
                    <span
                      key={day.date}
                      onMouseEnter={() => setHover(day)}
                      className={`aspect-square rounded-[2px] max-lg:w-[11px] ${SHADE[day.level]} ${hover?.date === day.date ? 'outline-ink outline outline-1' : ''}`}
                    />
                  ) : (
                    <span key={`${w}-${d}`} />
                  ),
                ),
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-xs">
          <p className="text-dim min-h-4" aria-live="polite">
            {hover ? (
              <>
                <span className="text-accent">{long(hover.date)}</span>: {hover.count === 0 ? 'sin contribuciones' : plural(hover.count, 'contribución', 'contribuciones')}
              </>
            ) : best && best.count > 0 ? (
              <>
                Día más activo: <span className="text-ink">{long(best.date)}</span>, con {plural(best.count, 'contribución', 'contribuciones')}
              </>
            ) : null}
          </p>
          <p className="text-dim flex items-center gap-1.5" aria-hidden="true">
            menos
            {SHADE.map((shade) => (
              <span key={shade} className={`size-[11px] rounded-[2px] ${shade}`} />
            ))}
            más
          </p>
        </div>

        <a href={data.url} target="_blank" rel="noopener noreferrer" className="text-accent mt-5 inline-block font-sans font-medium underline decoration-1 underline-offset-4">
          Ver mi perfil de GitHub
        </a>
      </div>
    </Window>
  )
}
