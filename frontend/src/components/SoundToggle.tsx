import { useEffect, useRef, useState } from 'react'

const KEY = 'sonido'

// Progresión lenta en la menor: cada compás tiene un bajo y un arpegio de 8 corcheas.
const BARS = [
  { bass: 110.0, notes: [220.0, 261.63, 329.63, 440.0, 329.63, 261.63, 329.63, 261.63] },
  { bass: 87.31, notes: [174.61, 220.0, 261.63, 349.23, 261.63, 220.0, 261.63, 220.0] },
  { bass: 130.81, notes: [196.0, 261.63, 329.63, 392.0, 329.63, 261.63, 329.63, 261.63] },
  { bass: 98.0, notes: [196.0, 246.94, 293.66, 392.0, 293.66, 246.94, 293.66, 246.94] },
]
const STEP = 0.36 // segundos por corchea (~83 bpm)

type Engine = { ctx: AudioContext; master: GainNode; timer: number; next: number; step: number }

function tone(e: Engine, type: OscillatorType, freq: number, at: number, length: number, peak: number) {
  const osc = e.ctx.createOscillator()
  const gain = e.ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, at)
  gain.gain.linearRampToValueAtTime(peak, at + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
  osc.connect(gain).connect(e.master)
  osc.start(at)
  osc.stop(at + length + 0.02)
}

/** Programa las notas del próximo medio segundo; se llama unas pocas veces por segundo. */
function schedule(e: Engine) {
  while (e.next < e.ctx.currentTime + 0.6) {
    const bar = BARS[Math.floor(e.step / 8) % BARS.length]
    const i = e.step % 8
    if (i === 0) tone(e, 'triangle', bar.bass, e.next, STEP * 7, 0.5)
    tone(e, 'square', bar.notes[i], e.next, STEP * 1.6, 0.12)
    if (i % 4 === 2) tone(e, 'triangle', bar.notes[i] * 2, e.next, STEP * 3, 0.1)
    e.next += STEP
    e.step++
  }
}

export default function SoundToggle() {
  const [on, setOn] = useState(false)
  const engine = useRef<Engine | null>(null)

  const start = () => {
    if (engine.current) return void engine.current.ctx.resume()
    const ctx = new AudioContext()
    const master = ctx.createGain()
    const soften = ctx.createBiquadFilter()
    soften.type = 'lowpass'
    soften.frequency.value = 1400
    master.gain.value = 0.0001
    master.gain.exponentialRampToValueAtTime(0.11, ctx.currentTime + 1.5) // volumen bajo, entra suave
    master.connect(soften).connect(ctx.destination)
    const e: Engine = { ctx, master, timer: 0, next: ctx.currentTime + 0.1, step: 0 }
    e.timer = window.setInterval(() => ctx.state === 'running' && schedule(e), 250)
    engine.current = e
  }

  const stop = () => {
    const e = engine.current
    if (!e) return
    clearInterval(e.timer)
    e.ctx.close()
    engine.current = null
  }

  // Recuerda la preferencia. El navegador exige un gesto antes de sonar, así que arranca con el primer toque.
  useEffect(() => {
    let remembered = false
    try {
      remembered = localStorage.getItem(KEY) === '1'
    } catch {}
    if (!remembered) return
    setOn(true)
    const first = () => start()
    window.addEventListener('pointerdown', first, { once: true })
    return () => window.removeEventListener('pointerdown', first)
  }, [])

  useEffect(() => {
    if (!on) return
    // Sonido corto al tocar enlaces y botones.
    const click = (ev: MouseEvent) => {
      const e = engine.current
      if (!e || e.ctx.state !== 'running') return
      if (!(ev.target as Element).closest?.('a, button, summary')) return
      const t = e.ctx.currentTime
      tone(e, 'square', 880, t, 0.07, 0.35)
      tone(e, 'square', 1320, t + 0.045, 0.09, 0.3)
    }
    // Sin sonido mientras la pestaña está oculta.
    const visibility = () => {
      const ctx = engine.current?.ctx
      if (!ctx) return
      if (document.hidden) ctx.suspend()
      else ctx.resume()
    }
    document.addEventListener('click', click, true)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      document.removeEventListener('click', click, true)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [on])

  useEffect(() => stop, [])

  const toggle = () => {
    const next = !on
    setOn(next)
    try {
      localStorage.setItem(KEY, next ? '1' : '0')
    } catch {}
    if (next) start()
    else stop()
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? 'Apagar música y sonidos' : 'Encender música y sonidos'}
      className={`pixel bg-surface/85 fixed right-4 bottom-4 z-30 flex items-center gap-2.5 rounded-full border px-3.5 py-3 backdrop-blur transition-colors ${
        on ? 'border-accent text-accent' : 'border-line text-dim hover:text-ink'
      }`}
    >
      <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
        {[0.5, 1, 0.7].map((h, i) => (
          <span
            key={i}
            className="w-[3px] origin-bottom bg-current"
            style={{ height: `${h * 100}%`, animation: on ? `eq 0.9s ${i * 0.18}s steps(4) infinite alternate` : undefined }}
          />
        ))}
      </span>
      {on ? 'Sonido' : 'Sin sonido'}
    </button>
  )
}
