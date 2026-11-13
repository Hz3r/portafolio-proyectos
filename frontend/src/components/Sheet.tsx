import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'

/** Modal: hoja que sube desde abajo en celular y cuadro centrado en pantallas grandes. */
export default function Sheet({
  label,
  onClose,
  children,
  wide = false,
}: {
  label: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      opener?.focus?.()
    }
  }, [onClose])

  return (
    <motion.div
      className="bg-bg/80 fixed inset-0 z-40 flex items-end justify-center backdrop-blur-sm sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
    >
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`bg-surface border-line relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border outline-none sm:rounded-3xl ${
          wide ? 'sm:max-w-2xl lg:max-w-6xl' : 'sm:max-w-lg'
        }`}
        initial={{ y: 40, opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="pixel bg-bg/80 border-line text-ink hover:border-accent hover:text-accent absolute top-3 right-3 z-10 rounded-full border px-3.5 py-2.5 backdrop-blur transition-colors"
        >
          Cerrar
        </button>
        {children}
      </motion.div>
    </motion.div>
  )
}
