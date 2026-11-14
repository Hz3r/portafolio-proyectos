import { useEffect, useState } from 'react'

export const OS = ['mac', 'linux', 'windows'] as const
export type Os = (typeof OS)[number]
export const OS_LABEL: Record<Os, string> = { mac: 'macOS', linux: 'Linux', windows: 'Windows' }
const KEY = 'ventana-estilo'
const EVENT = 'ventana-estilo'

/** El estilo de ventana elegido vale para todas las ventanas de la página y se recuerda entre visitas. */
export function useOs(): [Os, (next: Os) => void] {
  const [os, setOs] = useState<Os>('mac')
  useEffect(() => {
    const read = () => {
      try {
        const saved = localStorage.getItem(KEY) as Os | null
        if (saved && OS.includes(saved)) setOs(saved)
      } catch {}
    }
    read()
    addEventListener(EVENT, read)
    return () => removeEventListener(EVENT, read)
  }, [])
  const change = (next: Os) => {
    setOs(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {}
    dispatchEvent(new Event(EVENT))
  }
  return [os, change]
}

type Controls = { onClose?: () => void; onMinimize?: () => void; onMaximize?: () => void }

/** Botones de la barra. Sin acciones son solo decoración. */
function Buttons({ os, onClose, onMinimize, onMaximize }: { os: Os } & Controls) {
  const live = !!(onClose || onMinimize || onMaximize)
  const stop = (e: React.PointerEvent) => e.stopPropagation()
  const items = [
    { label: 'Minimizar', action: onMinimize, mac: 'bg-[#febc2e]', glyph: '─' },
    { label: 'Maximizar', action: onMaximize, mac: 'bg-[#28c840]', glyph: '□' },
    { label: 'Cerrar', action: onClose, mac: 'bg-[#ff5f57]', glyph: '✕' },
  ]
  // macOS: cerrar, minimizar, maximizar, a la izquierda.
  const order = os === 'mac' ? [items[2], items[0], items[1]] : items
  return (
    <div className={`flex shrink-0 items-center ${os === 'mac' ? 'gap-2' : os === 'linux' ? 'gap-1.5' : 'self-stretch'}`} aria-hidden={live ? undefined : 'true'}>
      {order.map((b) => {
        const shape =
          os === 'mac'
            ? `size-3 rounded-full ${b.mac} ${live ? 'hover:brightness-125' : ''}`
            : os === 'linux'
              ? `bg-line text-dim flex size-5 items-center justify-center rounded-full text-[0.625rem] leading-none ${live ? 'hover:text-ink hover:bg-[#33334a]' : ''}`
              : `text-dim flex w-10 items-center justify-center self-stretch text-xs ${live ? (b.label === 'Cerrar' ? 'hover:bg-[#c42b1c] hover:text-white' : 'hover:bg-line hover:text-ink') : ''}`
        const glyph = os === 'mac' ? null : b.glyph
        return live ? (
          <button key={b.label} type="button" aria-label={b.label} title={b.label} onClick={b.action} onPointerDown={stop} className={shape}>
            {glyph}
          </button>
        ) : (
          <span key={b.label} className={shape}>
            {glyph}
          </span>
        )
      })}
    </div>
  )
}

/**
 * Marco de ventana con la barra de macOS, Linux o Windows.
 * `barProps` permite arrastrarla o maximizarla desde la barra.
 */
export default function Window({
  os,
  title,
  children,
  className = '',
  barProps,
  ...controls
}: { os: Os; title: string; children: React.ReactNode; className?: string; barProps?: React.HTMLAttributes<HTMLDivElement> } & Controls) {
  const radius = os === 'mac' ? 'rounded-2xl' : os === 'linux' ? 'rounded-xl' : 'rounded-md'
  return (
    <div className={`border-line bg-bg/90 flex flex-col overflow-hidden border shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9)] backdrop-blur-md ${radius} ${className}`}>
      <div {...barProps} className={`border-line bg-surface flex h-10 shrink-0 items-center gap-3 border-b select-none ${os === 'windows' ? 'pl-3' : 'px-3.5'} ${barProps?.className ?? ''}`}>
        {os === 'mac' && <Buttons os={os} {...controls} />}
        {os !== 'mac' && (
          <span className={`font-mono text-accent text-xs font-semibold ${os === 'windows' ? 'bg-[#1d3a8a] rounded-sm px-1 text-white' : ''}`} aria-hidden="true">
            {os === 'windows' ? '>_' : '▸_'}
          </span>
        )}
        <p className={`text-dim min-w-0 flex-1 truncate font-mono text-xs ${os === 'mac' ? 'pr-[3.75rem] text-center' : ''}`}>{title}</p>
        {os !== 'mac' && <Buttons os={os} {...controls} />}
      </div>
      {children}
    </div>
  )
}
