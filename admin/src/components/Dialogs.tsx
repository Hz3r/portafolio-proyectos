'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

export type ConfirmOptions = {
  title: string
  body?: string
  /** Texto del botón de acción. Por defecto, "Confirmar". */
  action?: string
  /** Acción destructiva: el botón se pinta de rojo y el foco empieza en "Cancelar". */
  danger?: boolean
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void }
type Confirm = (options: ConfirmOptions) => Promise<boolean>

const Ctx = createContext<Confirm | null>(null)

/** Sustituye a `confirm()` del navegador por un diálogo con el estilo del panel. */
export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)
  const confirm = useCallback<Confirm>((options) => new Promise((resolve) => setPending({ ...options, resolve })), [])
  const close = (ok: boolean) => {
    pending?.resolve(ok)
    setPending(null)
  }

  return (
    <Ctx.Provider value={confirm}>
      {children}
      {pending && <ConfirmDialog key={pending.title} pending={pending} onClose={close} />}
    </Ctx.Provider>
  )
}

export function useConfirm(): Confirm {
  const confirm = useContext(Ctx)
  if (!confirm) throw new Error('useConfirm necesita <DialogProvider>')
  return confirm
}

function ConfirmDialog({ pending, onClose }: { pending: Pending; onClose: (ok: boolean) => void }) {
  const cancel = useRef<HTMLButtonElement>(null)
  const action = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Foco inicial: en las acciones destructivas, "Cancelar", para no borrar sin querer con Enter.
    ;(pending.danger ? cancel : action).current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose(false)
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [pending.danger, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onMouseDown={() => onClose(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={pending.body ? 'dialog-body' : undefined}
        onMouseDown={(e) => e.stopPropagation()}
        className="bg-surface border-line w-full max-w-md rounded-2xl border p-6 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)]"
      >
        <p className={`pixel ${pending.danger ? 'text-danger' : 'text-accent'}`}>{pending.danger ? 'Atención' : 'Confirmar'}</p>
        <h2 id="dialog-title" className="mt-3 text-lg font-semibold tracking-tight text-balance">
          {pending.title}
        </h2>
        {pending.body && (
          <p id="dialog-body" className="text-dim mt-2 text-sm leading-relaxed text-pretty">
            {pending.body}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancel} type="button" className="btn" onClick={() => onClose(false)}>
            Cancelar
          </button>
          <button
            ref={action}
            type="button"
            onClick={() => onClose(true)}
            className={pending.danger ? 'btn border-danger bg-danger text-bg hover:bg-danger/90' : 'btn btn-primary'}
          >
            {pending.action ?? 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
