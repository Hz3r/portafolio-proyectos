'use client'

import { useActionState } from 'react'
import { login } from '@/app/actions'

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, null)
  return (
    <form action={action} className="mt-8 space-y-5">
      <div>
        <label className="label" htmlFor="email">
          Correo
        </label>
        <input className="field" id="email" name="email" type="email" autoComplete="username" defaultValue={state?.email} required autoFocus />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Contraseña
        </label>
        <input className="field" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state && (
        <p role="alert" className="text-danger text-sm">
          {state.error}
        </p>
      )}
      <button className="btn btn-primary w-full py-3" disabled={pending}>
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
