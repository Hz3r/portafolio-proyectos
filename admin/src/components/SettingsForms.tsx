'use client'

import { useState, useTransition } from 'react'
import { type Site, updateAccount, updateSite } from '@/app/actions'
import { SOCIAL_KINDS, type Social } from '@/lib/types'

type Message = { kind: 'ok' | 'error'; text: string } | null
const Status = ({ message }: { message: Message }) =>
  message && (
    <p role="status" className={`text-sm ${message.kind === 'error' ? 'text-danger' : 'text-accent'}`}>
      {message.text}
    </p>
  )

/** Lo que se edita aquí; el contenido del portafolio tiene su propia sección. */
type Profile = Pick<Site, 'handle' | 'tagline' | 'link' | 'socials' | 'home'>
const profileOf = ({ handle, tagline, link, socials, home }: Site): Profile => ({ handle, tagline, link, socials, home })

const HOMES: { id: Site['home']; label: string; path: string; hint: string }[] = [
  { id: 'PROJECTS', label: 'Proyectos', path: '/proyectos', hint: 'Solo la lista de proyectos, con sus filtros.' },
  { id: 'PORTFOLIO', label: 'Portafolio', path: '/portafolio', hint: 'La página completa: quién eres, habilidades, trayectoria y contacto.' },
]

export default function SettingsForms({ site: initial, email: initialEmail, siteUrl }: { site: Site; email: string; siteUrl: string | null }) {
  const [site, setSite] = useState(() => profileOf(initial))
  const [savedSite, setSavedSite] = useState(site)
  const [siteMessage, setSiteMessage] = useState<Message>(null)

  const [email, setEmail] = useState(initialEmail)
  const [savedEmail, setSavedEmail] = useState(initialEmail)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [accountMessage, setAccountMessage] = useState<Message>(null)
  const [pending, startTransition] = useTransition()

  const siteDirty = JSON.stringify(site) !== JSON.stringify(savedSite)
  const accountDirty = email.trim().toLowerCase() !== savedEmail || next !== ''

  const saveSite = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await updateSite({ ...site, socials: site.socials.filter((s) => s.url.trim()) })
      if (!res.ok) return setSiteMessage({ kind: 'error', text: res.error })
      setSite(profileOf(res.data))
      setSavedSite(profileOf(res.data))
      setSiteMessage({ kind: 'ok', text: 'Perfil guardado. El sitio lo muestra en menos de un minuto.' })
    })
  }

  const saveAccount = (e: React.FormEvent) => {
    e.preventDefault()
    if (next && next !== repeat) return setAccountMessage({ kind: 'error', text: 'Las contraseñas nuevas no coinciden.' })
    startTransition(async () => {
      const res = await updateAccount({
        currentPassword: current,
        ...(email.trim().toLowerCase() !== savedEmail ? { email } : {}),
        ...(next ? { newPassword: next } : {}),
      })
      if (!res.ok) return setAccountMessage({ kind: 'error', text: res.error })
      setEmail(res.data.email)
      setSavedEmail(res.data.email)
      setCurrent('')
      setNext('')
      setRepeat('')
      setAccountMessage({ kind: 'ok', text: 'Acceso actualizado.' })
    })
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start">
      <form onSubmit={saveSite} className="bg-surface border-line rounded-2xl border p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Perfil del sitio</h2>
        <p className="text-dim mt-1 text-sm">El encabezado de la página de proyectos. El portafolio usa además lo que llenes en su sección.</p>

        <div className="mt-6 space-y-5">
          <div>
            <label className="label" htmlFor="handle">
              Usuario
            </label>
            <input id="handle" className="field !bg-bg" value={site.handle} onChange={(e) => (setSite({ ...site, handle: e.target.value }), setSiteMessage(null))} maxLength={40} placeholder="@tu_usuario" />
          </div>
          <div>
            <label className="label" htmlFor="tagline">
              Descripción
            </label>
            <textarea id="tagline" className="field !bg-bg min-h-20" value={site.tagline} onChange={(e) => (setSite({ ...site, tagline: e.target.value }), setSiteMessage(null))} maxLength={160} placeholder="Una línea sobre lo que construyes" />
            <p className="hint">{site.tagline.length}/160</p>
          </div>
          <div>
            <label className="label" htmlFor="link">
              Enlace del usuario
            </label>
            <input id="link" className="field !bg-bg" type="url" inputMode="url" value={site.link} onChange={(e) => (setSite({ ...site, link: e.target.value }), setSiteMessage(null))} placeholder="https://instagram.com/tu_usuario" />
            <p className="hint">Opcional. A dónde lleva tocar tu usuario en el sitio.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button className="btn btn-primary" disabled={pending || !siteDirty}>
            Guardar perfil
          </button>
          <Status message={siteMessage} />
        </div>
      </form>

      <form onSubmit={saveSite} className="bg-surface border-line rounded-2xl border p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Página de inicio</h2>
        <p className="text-dim mt-1 text-sm">
          Qué se abre al entrar a la dirección principal del sitio. Las dos páginas tienen además su enlace fijo, para compartir la que
          convenga en cada red.
        </p>
        <fieldset className="mt-5 space-y-2">
          <legend className="sr-only">Página de inicio</legend>
          {HOMES.map((h) => {
            const on = site.home === h.id
            return (
              <label key={h.id} className={`bg-bg flex items-start gap-3 rounded-xl border p-4 transition-colors ${on ? 'border-accent' : 'border-line hover:border-dim'}`}>
                <input type="radio" name="home" className="accent-accent mt-1 size-4 shrink-0" checked={on} onChange={() => (setSite({ ...site, home: h.id }), setSiteMessage(null))} />
                <span className="min-w-0">
                  <span className="block font-medium">{h.label}</span>
                  <span className="text-dim block text-sm">{h.hint}</span>
                  <span className="text-dim mt-1 block truncate text-xs">
                    Enlace fijo: {siteUrl ? `${siteUrl}${h.path}` : h.path}
                  </span>
                </span>
              </label>
            )
          })}
        </fieldset>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button className="btn btn-primary" disabled={pending || !siteDirty}>
            Guardar inicio
          </button>
        </div>
      </form>

      <form onSubmit={saveSite} className="bg-surface border-line rounded-2xl border p-5 sm:p-6 lg:col-span-2">
        <h2 className="text-lg font-semibold">Redes sociales</h2>
        <p className="text-dim mt-1 text-sm">
            Aparecen como iconos junto a tu usuario y en el contacto del portafolio. Tu GitHub además se enlaza en los créditos de cada proyecto.
          </p>
          <ul className="mt-4 space-y-2">
            {site.socials.map((social, i) => {
              const patch = (next: Partial<Social>) => {
                setSite({ ...site, socials: site.socials.map((s, j) => (j === i ? { ...s, ...next } : s)) })
                setSiteMessage(null)
              }
              return (
                <li key={i} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                  <select
                    className="field !bg-bg !w-auto shrink-0 !py-2.5"
                    value={social.kind}
                    onChange={(e) => patch({ kind: e.target.value as Social['kind'] })}
                    aria-label="Red social"
                  >
                    {Object.entries(SOCIAL_KINDS).map(([kind, label]) => (
                      <option key={kind} value={kind}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="field !bg-bg min-w-0 flex-1 basis-40"
                    value={social.url}
                    onChange={(e) => patch({ url: e.target.value })}
                    inputMode={social.kind === 'email' ? 'email' : 'url'}
                    placeholder={social.kind === 'email' ? 'tu@correo.com' : social.kind === 'github' ? 'https://github.com/tu_usuario' : 'https://'}
                    aria-label={`Enlace de ${SOCIAL_KINDS[social.kind]}`}
                  />
                  <button
                    type="button"
                    className="text-dim hover:text-danger px-1 py-2 text-sm"
                    onClick={() => (setSite({ ...site, socials: site.socials.filter((_, j) => j !== i) }), setSiteMessage(null))}
                  >
                    Quitar
                  </button>
                </li>
              )
            })}
          </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn"
            disabled={site.socials.length >= 12}
            onClick={() => {
              const used = new Set(site.socials.map((s) => s.kind))
              const kind = (Object.keys(SOCIAL_KINDS) as Social['kind'][]).find((k) => !used.has(k)) ?? 'web'
              setSite({ ...site, socials: [...site.socials, { kind, url: '' }] })
            }}
          >
            Añadir red
          </button>
          <button className="btn btn-primary" disabled={pending || !siteDirty}>
            Guardar redes
          </button>
        </div>
        {site.socials.length === 0 && <p className="text-dim mt-4 text-sm">Aún no hay ninguna. Empieza por tu GitHub.</p>}
      </form>

      <form onSubmit={saveAccount} className="bg-surface border-line rounded-2xl border p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Acceso al panel</h2>
        <p className="text-dim mt-1 text-sm">El correo y la contraseña con los que entras aquí.</p>

        <div className="mt-6 space-y-5">
          <div>
            <label className="label" htmlFor="email">
              Correo
            </label>
            <input id="email" className="field !bg-bg" type="email" autoComplete="username" value={email} onChange={(e) => (setEmail(e.target.value), setAccountMessage(null))} required />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="next">
                Contraseña nueva
              </label>
              <input id="next" className="field !bg-bg" type="password" autoComplete="new-password" value={next} onChange={(e) => (setNext(e.target.value), setAccountMessage(null))} minLength={8} placeholder="Déjala vacía para no cambiarla" />
            </div>
            <div>
              <label className="label" htmlFor="repeat">
                Repítela
              </label>
              <input id="repeat" className="field !bg-bg" type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} disabled={!next} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="current">
              Contraseña actual
            </label>
            <input id="current" className="field !bg-bg" type="password" autoComplete="current-password" value={current} onChange={(e) => (setCurrent(e.target.value), setAccountMessage(null))} required />
            <p className="hint">Necesaria para confirmar cualquier cambio de acceso.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button className="btn btn-primary" disabled={pending || !accountDirty || !current}>
            Guardar acceso
          </button>
          <Status message={accountMessage} />
        </div>
      </form>
    </div>
  )
}
