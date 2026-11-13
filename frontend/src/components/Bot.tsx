// Mascota robot en pixel art. Rejilla de 12x13; cada celda mide 2 unidades.
const cells = (rows: string[], mark: string) =>
  rows
    .flatMap((row, y) => [...row].flatMap((c, x) => (c === mark ? `M${x * 2} ${y * 2}h2v2h-2z` : [])))
    .join('')

const BODY = [
  '.....a......',
  '.....x......',
  '..xxxxxxxx..',
  '.xxxxxxxxxx.',
  '.xxeexxeexx.',
  '.xxeexxeexx.',
  '.xxxxxxxxxx.',
  '..xxxxxxxx..',
  '...xxxxxx...',
  '.xxxxxxxxxx.',
  '...xxxxxx...',
]
const LEGS_A = ['', '', '', '', '', '', '', '', '', '', '', '...xx..xx...', '...xx..xx...']
const LEGS_B = ['', '', '', '', '', '', '', '', '', '', '', '..xx....xx..', '..xx....xx..']

const body = cells(BODY, 'x')
const eyes = cells(BODY, 'e') + cells(BODY, 'a')
const legsA = cells(LEGS_A, 'x')
const legsB = cells(LEGS_B, 'x')

/** `glow` es el color de ojos y antena. Con `walking` alterna las piernas. */
export default function Bot({ glow = 'var(--color-accent)', walking = false, size = 24 }: { glow?: string; walking?: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={(size * 26) / 24}
      viewBox="0 0 24 26"
      shapeRendering="crispEdges"
      className={walking ? 'bot bot-walking' : 'bot'}
      aria-hidden="true"
    >
      <path d={body} fill="#d9d9e3" />
      <path d={eyes} fill={glow} className="bot-eyes" />
      <path d={legsA} fill="#d9d9e3" className="bot-legs-a" />
      <path d={legsB} fill="#d9d9e3" className="bot-legs-b" />
    </svg>
  )
}
