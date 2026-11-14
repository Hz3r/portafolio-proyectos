import { motion, useDragControls } from 'motion/react'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type JourneyItem, ROUTES, type SkillGroup } from '../../lib/api'
import Sprite from '../Sprite'
import Window, { OS, OS_LABEL, type Os, useOs } from './Window'

export type TerminalData = {
  name: string
  role: string
  location: string
  /** Texto de disponibilidad, o vacío si no se muestra. */
  available: string
  avatar: string | null
  /** El backend tiene un asistente que responde preguntas libres. */
  ai: boolean
  skills: SkillGroup[]
  projects: { title: string; slug: string; summary: string; year: number | null; tags: string[]; private: boolean }[]
  journey: JourneyItem[]
  services: { title: string; text: string }[]
  socials: { label: string; url: string }[]
  email: string
  cvHref: string | null
  sections: { id: string; label: string }[]
  github: { user: string; total: number } | null
}

type Line = { id: number; node: ReactNode }
const KIND: Record<JourneyItem['kind'], string> = { WORK: 'trabajo', EDUCATION: 'formación', CERT: 'certificación', MILESTONE: 'logro' }
const LEVEL = ['', 'aprendiendo', 'con soltura', 'la domino']
const plain = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const slug = (text: string) => plain(text).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'visitante'

const Key = ({ children }: { children: ReactNode }) => <span className="text-accent">{children}</span>
const Dim = ({ children }: { children: ReactNode }) => <span className="text-dim">{children}</span>
const Ext = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer" className="text-accent underline decoration-1 underline-offset-2">
    {children}
  </a>
)

/**
 * Terminal del portafolio: se puede escribir en ella, arrastrarla, maximizarla y cambiarle el sistema.
 * Responde con comandos sobre el contenido del portafolio y, si el backend lo tiene activado, a preguntas libres.
 */
export default function Terminal({ data }: { data: TerminalData }) {
  const [os, setOs] = useOs()
  const [lines, setLines] = useState<Line[]>([])
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [intro, setIntro] = useState<string | null>('')
  const [state, setState] = useState<'open' | 'max' | 'closed'>('open')
  const [canDrag, setCanDrag] = useState(false)
  const history = useRef<string[]>([])
  const cursor = useRef(-1)
  const nextId = useRef(0)
  const body = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const drag = useDragControls()

  const user = useMemo(() => slug(data.name.replace(/^@/, '')), [data.name])
  const prompt = os === 'windows' ? `PS C:\\Users\\${user}>` : os === 'linux' ? `${user}@portafolio:~$` : `${user}@portafolio ~ %`
  const skills = useMemo(() => data.skills.flatMap((g) => g.tags.map((t) => ({ ...t, group: g.group || 'Otras' }))), [data.skills])

  const print = useCallback((node: ReactNode) => {
    const id = nextId.current++
    setLines((list) => [...list, { id, node }])
    return id
  }, [])
  const replace = (id: number, node: ReactNode) => setLines((list) => list.map((l) => (l.id === id ? { id, node } : l)))

  const go = (id: string) => {
    setState((s) => (s === 'max' ? 'open' : s))
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  // Cada comando devuelve lo que imprime. `run` se pasa para los que ofrecen otros comandos como botones.
  const commands = useMemo(() => {
    const Cmd = ({ name, hint }: { name: string; hint: string }) => (
      <span className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-x-2">
        <button type="button" className="text-accent text-left hover:underline" onClick={() => exec(name.split(' ')[0])}>
          {name}
        </button>
        <Dim>{hint}</Dim>
      </span>
    )

    const neofetch = () => {
      const top = skills.filter((s) => (s.skillLevel ?? 2) === 3).map((s) => s.name)
      const rows: [string, ReactNode][] = [
        ['rol', data.role],
        ['ubicación', data.location],
        ['estado', data.available],
        ['proyectos', data.projects.length ? `${data.projects.length} publicados` : ''],
        ['habilidades', skills.length ? `${skills.length} tecnologías` : ''],
        ['domina', top.slice(0, 5).join(', ')],
        ['github', data.github ? `${data.github.total.toLocaleString('es')} contribuciones este año` : ''],
        ['shell', 'portafolio-sh 1.0'],
      ]
      return (
        <div className="flex items-center gap-4 py-1 sm:gap-6">
          <div className="border-line bg-surface flex size-16 shrink-0 items-center justify-center self-start overflow-hidden rounded-full border sm:size-24">
            {data.avatar ? <img src={data.avatar} alt={`Foto de ${data.name}`} className="h-full w-full object-cover" /> : <Sprite kind="robot" size={40} />}
          </div>
          <div className="min-w-0">
            <p>
              <Key>{user}</Key>
              <Dim>@</Dim>
              <Key>portafolio</Key>
            </p>
            <p className="text-dim" aria-hidden="true">
              {'─'.repeat(user.length + 11)}
            </p>
            {rows
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <p key={k}>
                  <Key>{k}</Key>
                  <Dim>:</Dim> {v}
                </p>
              ))}
            <p className="mt-2 flex gap-1" aria-hidden="true">
              {['#9eff5a', '#b48cff', '#6ea8ff', '#22c9a8', '#ff8a4c', '#ff6ad5', '#ededf2'].map((c) => (
                <span key={c} className="size-3" style={{ background: c }} />
              ))}
            </p>
          </div>
        </div>
      )
    }

    const projects = (arg: string) => {
      const q = plain(arg)
      const found = data.projects.map((p, i) => ({ ...p, n: i + 1 })).filter((p) => !q || plain(p.title).includes(q) || p.tags.some((t) => plain(t).includes(q)))
      if (!found.length) return <p>Ningún proyecto publicado coincide con “{arg}”. Escribe <Key>proyectos</Key> para verlos todos.</p>
      return (
        <div>
          {found.map((p) => (
            <p key={p.slug} className="grid grid-cols-[1.75rem_minmax(0,1fr)]">
              <Dim>{String(p.n).padStart(2, '0')}</Dim>
              <span>
                <a href={`/p/${p.slug}`} className="text-accent underline decoration-1 underline-offset-2">
                  {p.title}
                </a>
                {p.year && <Dim> ({p.year})</Dim>}
                {p.private && <Dim> [privado]</Dim>}
                {p.tags.length > 0 && <Dim> {p.tags.slice(0, 4).join(', ')}</Dim>}
              </span>
            </p>
          ))}
          <p className="text-dim mt-1">
            <Key>abrir {'<número>'}</Key> entra a un proyecto. <a href={ROUTES.projects} className="underline underline-offset-2">Ver la página de proyectos</a>.
          </p>
        </div>
      )
    }

    const skillList = (arg: string) => {
      const q = plain(arg)
      const groups = data.skills.filter((g) => !q || plain(g.group || 'otras').includes(q))
      if (!data.skills.length) return <p>Todavía no hay habilidades cargadas.</p>
      if (!groups.length) return <p>No hay un área “{arg}”. Áreas: {data.skills.map((g) => g.group || 'Otras').join(', ')}.</p>
      return (
        <div>
          {groups.map((g) => (
            <p key={g.group}>
              <Key>{g.group || 'Otras'}</Key>
              <Dim>:</Dim>{' '}
              {g.tags.map((t, i) => (
                <span key={t.id}>
                  {i > 0 && ', '}
                  {t.name}
                  <Dim> ({LEVEL[t.skillLevel ?? 2]})</Dim>
                </span>
              ))}
            </p>
          ))}
        </div>
      )
    }

    const journey = () =>
      data.journey.length ? (
        <div>
          {data.journey.map((j) => (
            <p key={j.id}>
              <Key>{j.period || KIND[j.kind]}</Key> {j.title}
              {j.place && <Dim> en {j.place}</Dim>}
              {j.period && <Dim> [{KIND[j.kind]}]</Dim>}
            </p>
          ))}
        </div>
      ) : (
        <p>Todavía no hay etapas cargadas.</p>
      )

    const contact = () => {
      const items = [...(data.email ? [{ label: 'correo', url: `mailto:${data.email}`, text: data.email }] : []), ...data.socials.filter((s) => !s.url.startsWith('mailto:')).map((s) => ({ label: plain(s.label), url: s.url, text: s.url.replace(/^https?:\/\/(www\.)?/, '') }))]
      if (!items.length) return <p>Todavía no hay medios de contacto cargados.</p>
      return (
        <div>
          {items.map((s) => (
            <p key={s.url}>
              <Key>{s.label}</Key>
              <Dim>:</Dim> <Ext href={s.url}>{s.text}</Ext>
            </p>
          ))}
        </div>
      )
    }

    const table: Record<string, (arg: string) => ReactNode> = {
      ayuda: () => (
        <div>
          <Cmd name="neofetch" hint="quién soy, de un vistazo" />
          <Cmd name="proyectos [tec]" hint="lista los proyectos; filtra por tecnología" />
          <Cmd name="abrir <n>" hint="entra a un proyecto" />
          <Cmd name="habilidades [área]" hint="tecnologías y nivel" />
          <Cmd name="trayectoria" hint="trabajos, estudios y logros" />
          {data.services.length > 0 && <Cmd name="servicios" hint="en qué puedo ayudarte" />}
          <Cmd name="contacto" hint="correo y redes" />
          {data.cvHref && <Cmd name="cv" hint="abre mi currículum" />}
          {data.github && <Cmd name="github" hint="actividad del último año" />}
          <Cmd name="ir <sección>" hint={`salta a: ${data.sections.map((s) => s.id).join(', ')}`} />
          <Cmd name="tema <sistema>" hint="mac, linux o windows" />
          <Cmd name="limpiar" hint="borra la pantalla" />
          <p className="text-dim mt-1">
            {data.ai ? 'También puedes escribir una pregunta con tus palabras: responde un asistente con los datos de este portafolio.' : 'También puedes preguntar con tus palabras, por ejemplo: ¿con qué tecnologías trabajas?'}
          </p>
        </div>
      ),
      neofetch,
      proyectos: projects,
      habilidades: skillList,
      trayectoria: journey,
      contacto: contact,
      servicios: () =>
        data.services.length ? (
          <div>
            {data.services.map((s) => (
              <p key={s.title}>
                <Key>{s.title}</Key>
                {s.text && <Dim>: {s.text}</Dim>}
              </p>
            ))}
          </div>
        ) : (
          <p>No hay servicios cargados.</p>
        ),
      abrir: (arg) => {
        const n = Number(arg)
        const q = plain(arg)
        const project = Number.isInteger(n) && n > 0 ? data.projects[n - 1] : q ? data.projects.find((p) => plain(p.title).includes(q)) : undefined
        if (!project) return <p>Dime cuál: <Key>abrir 1</Key> o <Key>abrir {'<nombre>'}</Key>. Escribe <Key>proyectos</Key> para ver la lista.</p>
        setTimeout(() => (location.href = `/p/${project.slug}`), 500)
        return <p>Abriendo {project.title}…</p>
      },
      cv: () => {
        if (!data.cvHref) return <p>Todavía no hay currículum cargado.</p>
        window.open(data.cvHref, '_blank', 'noopener')
        return <p>Abriendo el currículum en otra pestaña. Si no se abre: <Ext href={data.cvHref}>descargar CV</Ext>.</p>
      },
      github: () => {
        if (!data.github) return <p>No hay GitHub enlazado.</p>
        go('actividad')
        return <p>{data.github.total.toLocaleString('es')} contribuciones en el último año. Te llevo al calendario.</p>
      },
      ir: (arg) => {
        const q = plain(arg).replace(/\s+/g, '-')
        const section = data.sections.find((s) => s.id === q || plain(s.label).replace(/\s+/g, '-') === q) ?? (q ? data.sections.find((s) => s.id.startsWith(q)) : undefined)
        if (!section) return <p>Secciones: {data.sections.map((s) => s.id).join(', ')}. Ejemplo: <Key>ir {data.sections[0]?.id ?? 'contacto'}</Key>.</p>
        go(section.id)
        return <p>Bajando a {section.label}…</p>
      },
      tema: (arg) => {
        const q = plain(arg)
        const next = OS.find((o) => o === q || plain(OS_LABEL[o]) === q || (q === 'win' && o === 'windows'))
        if (!next) return <p>Sistemas: mac, linux, windows. Ahora: {OS_LABEL[os]}.</p>
        setOs(next)
        return <p>Ventanas en estilo {OS_LABEL[next]}.</p>
      },
      fecha: () => <p>{new Date().toLocaleString('es', { dateStyle: 'full', timeStyle: 'short' })}</p>,
      sudo: () => <p>{user} no está en el archivo sudoers. Este incidente será reportado al robot.</p>,
    }
    const alias: Record<string, string> = {
      help: 'ayuda', '?': 'ayuda', whoami: 'neofetch', quien: 'neofetch', 'sobre-mi': 'neofetch', projects: 'proyectos', ls: 'proyectos', skills: 'habilidades', stack: 'habilidades',
      experiencia: 'trayectoria', exp: 'trayectoria', contact: 'contacto', redes: 'contacto', open: 'abrir', cd: 'ir', goto: 'ir', theme: 'tema', date: 'fecha', curriculum: 'cv', git: 'github',
    }
    return { table, alias }
    // `exec` cambia en cada render; los comandos solo dependen de los datos y del sistema elegido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, skills, os, user])

  /** Respuesta local a una pregunta escrita con palabras, cuando no hay asistente. */
  const guess = (text: string): ReactNode | null => {
    const q = plain(text)
    const { table } = commands
    if (/proyect|hecho|constru|portafolio|trabajos? hech/.test(q)) return table.proyectos('')
    if (/tecnolog|habilidad|stack|lenguaje|framework|sabe|domina|maneja/.test(q)) return table.habilidades('')
    if (/experiencia|trabaj|estudi|formacion|carrera|certific|trayectoria/.test(q)) return table.trayectoria('')
    if (/contact|correo|email|mail|escrib|red(es)? social|linkedin|hablar/.test(q)) return table.contacto('')
    if (/dispon|contrat|freelance|libre/.test(q)) return <p>{data.available || 'No indica disponibilidad ahora mismo.'} Escribe <Key>contacto</Key> para hablar.</p>
    if (/servicio|ayudar|ofrece|precio|cobra/.test(q)) return table.servicios('')
    if (/quien|eres|sobre ti|presenta|donde vive|ubicacion|de donde/.test(q)) return table.neofetch('')
    if (/cv|curriculum|hoja de vida/.test(q)) return table.cv('')
    const skill = skills.find((s) => q.includes(plain(s.name)))
    if (skill) return table.proyectos(skill.name)
    return null
  }

  const exec = async (raw: string) => {
    const text = raw.trim()
    if (!text || busy) return
    history.current = [text, ...history.current.filter((h) => h !== text)].slice(0, 40)
    cursor.current = -1
    setValue('')
    print(
      <p>
        <Key>{prompt}</Key> {text}
      </p>,
    )
    const [first, ...rest] = text.split(/\s+/)
    const name = plain(first)
    const command = commands.alias[name] ?? name
    if (command === 'limpiar' || command === 'clear' || command === 'cls') return setLines([])
    if (commands.table[command]) return void print(commands.table[command](rest.join(' ')))

    // No es un comando: es una pregunta.
    const question = /^(preguntar|pregunta|ask)$/.test(name) ? rest.join(' ') : text
    if (question.length >= 2 && data.ai) {
      setBusy(true)
      const id = print(<p className="text-dim animate-pulse">consultando al asistente…</p>)
      try {
        const res = await fetch('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: question.slice(0, 300) }) })
        const reply = (await res.json().catch(() => null)) as { answer?: string; error?: string } | null
        if (res.ok && reply?.answer) replace(id, <p className="whitespace-pre-wrap">{reply.answer}</p>)
        else replace(id, guess(question) ?? <p className="text-dim">{reply?.error ?? 'El asistente no responde ahora.'} Escribe <Key>ayuda</Key> para ver los comandos.</p>)
      } catch {
        replace(id, guess(question) ?? <p className="text-dim">Sin conexión con el asistente. Escribe <Key>ayuda</Key> para ver los comandos.</p>)
      }
      setBusy(false)
      setTimeout(() => input.current?.focus(), 0)
      return
    }
    print(guess(question) ?? <p>No conozco “{first}”. Escribe <Key>ayuda</Key> para ver qué puedo hacer.</p>)
  }

  // Al cargar, la terminal escribe sola su primer comando.
  useEffect(() => {
    setCanDrag(matchMedia('(pointer: fine) and (min-width: 64rem)').matches)
    const first = 'neofetch'
    const show = () => {
      setIntro(null)
      print(
        <p>
          <Key>{prompt}</Key> {first}
        </p>,
      )
      print(commands.table.neofetch(''))
      print(
        <p className="text-dim">
          Escribe <Key>ayuda</Key>{data.ai ? ' o pregúntame lo que quieras.' : ' para ver los comandos.'}
        </p>,
      )
    }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return show()
    let i = 0
    const timer = setInterval(() => {
      i++
      setIntro(first.slice(0, i))
      if (i === first.length) {
        clearInterval(timer)
        setTimeout(show, 350)
      }
    }, 90)
    return () => clearInterval(timer)
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const el = body.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines, intro, state])

  // Maximizada ocupa la pantalla: Escape la devuelve a su sitio.
  useEffect(() => {
    if (state !== 'max') return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setState('open')
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    input.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [state])

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') return void exec(value)
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.max(-1, Math.min(history.current.length - 1, cursor.current + (e.key === 'ArrowUp' ? 1 : -1)))
      cursor.current = next
      return setValue(next === -1 ? '' : history.current[next])
    }
    if (e.key === 'Tab' && value.trim() && !value.includes(' ')) {
      const options = [...Object.keys(commands.table), 'limpiar'].filter((c) => c.startsWith(plain(value)))
      if (options.length) {
        e.preventDefault()
        if (options.length === 1) setValue(`${options[0]} `)
        else print(<p className="text-dim">{options.join('  ')}</p>)
      }
    }
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      setLines([])
    }
  }

  if (state === 'closed') {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <button type="button" onClick={() => setState('open')} className="border-line bg-surface/70 hover:border-accent flex items-center gap-3 rounded-full border py-2.5 pr-5 pl-4 font-mono text-sm transition-colors">
          <Sprite kind="robot" size={18} />
          Abrir la terminal
        </button>
      </div>
    )
  }

  const max = state === 'max'
  const quick = ['ayuda', 'proyectos', 'habilidades', 'trayectoria', 'contacto']
  return (
    <>
      {max && <div className="bg-bg/85 fixed inset-0 z-40 backdrop-blur-sm" onClick={() => setState('open')} />}
      <motion.div
        drag={canDrag && !max}
        dragControls={drag}
        dragListener={false}
        dragMomentum={false}
        dragElastic={0.12}
        dragConstraints={{ top: -70, bottom: 90, left: -160, right: 40 }}
        className={max ? 'fixed inset-2 z-50 sm:inset-8' : 'relative'}
        style={max ? { x: 0, y: 0 } : undefined}
      >
        <Window
          os={os}
          title={`${user}@portafolio: ~`}
          className={max ? 'h-full' : ''}
          onClose={() => setState('closed')}
          onMinimize={() => setState('closed')}
          onMaximize={() => setState(max ? 'open' : 'max')}
          barProps={{
            onPointerDown: (e) => canDrag && !max && drag.start(e),
            onDoubleClick: () => setState(max ? 'open' : 'max'),
            className: canDrag && !max ? 'cursor-grab active:cursor-grabbing touch-none' : '',
          }}
        >
          <div
            ref={body}
            onClick={() => !getSelection()?.toString() && input.current?.focus({ preventScroll: true })}
            className={`overflow-y-auto overscroll-contain px-4 py-4 font-mono text-[0.8125rem] leading-relaxed break-words [scrollbar-width:thin] sm:px-5 ${max ? 'min-h-0 flex-1' : 'h-[23rem] sm:h-[26rem]'}`}
          >
            <div className="space-y-2" role="log" aria-live="polite">
              {lines.map((l) => (
                <div key={l.id}>{l.node}</div>
              ))}
            </div>
            {intro !== null ? (
              <p>
                <Key>{prompt}</Key> {intro}
                <span className="cursor-blink" aria-hidden="true" />
              </p>
            ) : (
              <label className={`flex gap-2 ${lines.length ? 'mt-2' : ''}`}>
                <span className="text-accent shrink-0">{prompt}</span>
                <input
                  ref={input}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={onKeyDown}
                  disabled={busy}
                  maxLength={300}
                  autoCapitalize="off"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  enterKeyHint="send"
                  aria-label="Escribe un comando o una pregunta"
                  className="caret-accent min-w-0 flex-1 bg-transparent outline-none"
                />
              </label>
            )}
          </div>

          <div className="border-line flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-t px-4 py-2.5 sm:px-5">
            <ul className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 [scrollbar-width:none] max-sm:basis-full" aria-label="Comandos rápidos">
              {quick.map((c) => (
                <li key={c} className="shrink-0">
                  <button type="button" disabled={busy || intro !== null} onClick={() => exec(c)} className="border-line text-dim hover:border-accent hover:text-accent rounded-full border px-2.5 py-1 font-mono text-xs transition-colors disabled:opacity-50">
                    {c}
                  </button>
                </li>
              ))}
            </ul>
            <div role="radiogroup" aria-label="Sistema de las ventanas" className="border-line flex shrink-0 rounded-full border p-0.5">
              {OS.map((o: Os) => (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={os === o}
                  onClick={() => setOs(o)}
                  className={`rounded-full px-2.5 py-1 font-mono text-xs transition-colors ${os === o ? 'bg-accent text-bg' : 'text-dim hover:text-ink'}`}
                >
                  {OS_LABEL[o]}
                </button>
              ))}
            </div>
          </div>
        </Window>
      </motion.div>
    </>
  )
}
