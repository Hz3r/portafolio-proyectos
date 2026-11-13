'use client'

import { useState, useTransition } from 'react'
import { type Site, updateAccount, updateSite } from '@/app/actions'

type Message = { kind: 'ok' | 'error'; text: string } | null
const Status = ({ message }: { message: Message }) =>
  message && (
    <p role="status" className={`text-sm ${message.kind === 'error' ? 'text-danger' : 'text-accent'}`}>
      {message.text}
    </p>
  )

export default function SettingsForms({ site: initialSite, email: initialEmail }: { site: Site; email: string }) {
  const [site, setSite] = useState(initialSite)
  const [savedSite, setSavedSite] = useState(initialSite)
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
      const res = await updateSite(site)
      if (!res.ok) return setSiteMessage({ kind: 'error', text: res.error })
      setSite(res.data)
      setSavedSite(res.data)
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
        <p className="text-dim mt-1 text-sm">Lo que ve quien entra, arriba de tus proyectos.</p>

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
