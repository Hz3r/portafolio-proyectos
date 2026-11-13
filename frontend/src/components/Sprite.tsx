// Personajes en pixel art. Cada fila es una cadena de 12 celdas; cada letra es un color de la paleta.
type Def = {
  rows: string[]
  /** Dos poses de piernas que se alternan al caminar. */
  legs?: [string[], string[]]
  palette: Record<string, string>
  /** Qué letra pinta las piernas. */
  leg?: string
}

const SPRITES = {
  // Robot clásico de visor verde.
  robot: {
    rows: ['.....e......', '.....x......', '..xxxxxxxx..', '.xxxxxxxxxx.', '.xxeexxeexx.', '.xxeexxeexx.', '.xxxxxxxxxx.', '..xxxxxxxx..', '...xxxxxx...', '.xxxxxxxxxx.', '...xxxxxx...'],
    legs: [['...xx..xx...', '...xx..xx...'], ['..xx....xx..', '..xx....xx..']],
    palette: { x: '#d9d9e3', e: '#9eff5a' },
    leg: 'x',
  },
  // Robot de acero con un solo visor ancho.
  ciclope: {
    rows: ['...xxxxxx...', '..xxxxxxxx..', '..xeeeeeex..', '..xeeeeeex..', '..xxxxxxxx..', '....xxxx....', '.xxxxxxxxxx.', '.x.xxxxxx.x.', '.x.xxxxxx.x.', '...xxxxxx...'],
    legs: [['...xx..xx...', '...xx..xx...'], ['..xx....xx..', '..xx....xx..']],
    palette: { x: '#8f9bb8', e: '#b48cff' },
    leg: 'x',
  },
  // Chispa: un destello naranja con patas.
  chispa: {
    rows: ['.....oo.....', '.o...oo...o.', '..o.oooo.o..', '...oooooo...', 'ooookookoooo', 'ooookookoooo', '...oooooo...', '..o.oooo.o..', '.o...oo...o.', '.....oo.....'],
    legs: [['....o..o....', '....o..o....'], ['...o....o...', '...o....o...']],
    palette: { o: '#ff8a4c', k: '#1a0f08' },
    leg: 'o',
  },
  // Estrella de cuatro puntas que flota.
  estrella: {
    rows: ['.....bb.....', '.....bb.....', '....bvvb....', '...bvvvvb...', 'bbvvwvvwvvbb', 'bbvvwvvwvvbb', '...bvvvvb...', '....bvvb....', '.....bb.....', '.....bb.....'],
    palette: { b: '#6ea8ff', v: '#9d8cff', w: '#ffffff' },
  },
  // Fantasma.
  fantasma: {
    rows: ['...gggggg...', '..gggggggg..', '.gggggggggg.', '.ggttggttgg.', '.ggttggttgg.', '.gggggggggg.', '.gggggggggg.', '.gggggggggg.', '.gg.gggg.gg.', '.g...gg...g.'],
    palette: { g: '#e6f4f1', t: '#22c9a8' },
  },
  // Baba verde que avanza a saltitos.
  baba: {
    rows: ['...ssssss...', '..shssssss..', '.ssksssskss.', '.ssssssssss.', 'ssssssssssss'],
    palette: { s: '#6fdc7a', h: '#c9ffcf', k: '#0d2a12' },
  },
  // Dron con cúpula.
  dron: {
    rows: ['....cccc....', '...cccccc...', '.xxxxxxxxxx.', 'xmxxmxxmxxmx', '.xxxxxxxxxx.', '...x....x...'],
    palette: { c: '#8fe9ff', x: '#aab2c5', m: '#ff6ad5' },
  },
} satisfies Record<string, Def>

export type SpriteKind = keyof typeof SPRITES

const path = (rows: string[], letter: string, offsetY = 0) =>
  rows
    .flatMap((row, y) => [...row].flatMap((c, x) => (c === letter ? `M${x * 2} ${(y + offsetY) * 2}h2v2h-2z` : [])))
    .join('')

/** Dibuja un personaje. `size` es el ancho en píxeles; con piernas, alterna las dos poses. */
export default function Sprite({ kind = 'robot', size = 24 }: { kind?: SpriteKind; size?: number }) {
  const def: Def = SPRITES[kind]
  const total = def.rows.length + (def.legs ? def.legs[0].length : 0)
  return (
    <svg
      width={size}
      height={(size * total) / 12}
      viewBox={`0 0 24 ${total * 2}`}
      shapeRendering="crispEdges"
      className="sprite"
      aria-hidden="true"
    >
      {Object.entries(def.palette).map(([letter, color]) => (
        <path key={letter} d={path(def.rows, letter)} fill={color} />
      ))}
      {def.legs && def.leg && (
        <>
          <path d={path(def.legs[0], def.leg, def.rows.length)} fill={def.palette[def.leg]} className="sprite-legs-a" />
          <path d={path(def.legs[1], def.leg, def.rows.length)} fill={def.palette[def.leg]} className="sprite-legs-b" />
        </>
      )}
    </svg>
  )
}
