'use client'

import { verticalListSortingStrategy } from '@dnd-kit/sortable'
import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { presignUpload, updateSite } from '@/app/actions'
import { JOURNEY_KINDS, type JourneyItem, type Portfolio } from '@/lib/types'
import { uploadFile } from '@/lib/upload'
import GalleryEditor from './GalleryEditor'
import { Grip, SortableItem, SortableList } from './Sortable'
import { Tabs } from './ui'

const TABS = [
  { id: 'presentacion', label: 'Presentación' },
  { id: 'sobre-mi', label: 'Sobre mí' },
  { id: 'trayectoria', label: 'Trayectoria' },
  { id: 'galeria', label: 'Galería' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'contacto', label: 'Contacto' },
] as const
type Tab = (typeof TABS)[number]['id']

const uid = () => Math.random().toString(36).slice(2, 10)
/** Lo que se guarda: sin las direcciones que calcula el servidor. */
const strip = ({ avatarUrl: _a, cvHref: _c, gallery, ...rest }: Portfolio) => ({
  ...rest,
  gallery: gallery.map((c) => ({ ...c, items: c.items.map(({ url: _u, ...item }) => item) })),
})

function Field({ label, hint, count, max, children }: { label: string; hint?: string; count?: number; max?: number; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label flex items-baseline justify-between gap-3">
        {label}
        {max !== undefined && <span className={`text-xs font-normal tabular-nums ${count === max ? 'text-danger' : 'text-dim'}`}>{count}/{max}</span>}
      </span>
      {children}
      {hint && <span className="hint block">{hint}</span>}
    </label>
  )
}

/** Fila ordenable de una lista (cifras, trayectoria, servicios). */
function Row({ id, label, onRemove, children }: { id: string; label: string; onRemove: () => void; children: React.ReactNode }) {
  return (
    <SortableItem id={id}>
      {(handle, dragging) => (
        <div className={`bg-bg flex gap-2 rounded-2xl border p-3 sm:gap-3 sm:p-4 ${dragging ? 'border-accent shadow-2xl' : 'border-line'}`}>
          <button type="button" ref={handle.ref} {...handle.props} className="text-dim hover:text-ink touch-none self-start px-1.5 py-3" style={{ cursor: dragging ? 'grabbing' : 'grab' }} aria-label={`Mover ${label}`}>
            <Grip />
          </button>
          <div className="min-w-0 flex-1">{children}</div>
          <button type="button" onClick={onRemove} className="text-dim hover:text-danger self-start px-1.5 py-2 text-sm" aria-label={`Quitar ${label}`}>
            Quitar
          </button>
        </div>
      )}
    </SortableItem>
  )
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="border-line text-dim rounded-2xl border border-dashed px-5 py-8 text-center text-sm">{children}</p>
)

export default function PortfolioEditor({ initial, initialTab, previewUrl }: { initial: Portfolio; initialTab?: string; previewUrl: string | null }) {
  const [saved, setSaved] = useState(initial)
  const [form, setForm] = useState(initial)
  const [tab, setTab] = useState<Tab>(TABS.find((t) => t.id === initialTab)?.id ?? 'presentacion')
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [uploading, setUploading] = useState<'avatar' | 'cv' | null>(null)
  const [pending, startTransition] = useTransition()
  const avatarInput = useRef<HTMLInputElement>(null)
  const cvInput = useRef<HTMLInputElement>(null)

  const dirty = JSON.stringify(strip(form)) !== JSON.stringify(strip(saved))
  const set = <K extends keyof Portfolio>(key: K, value: Portfolio[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setMessage(null)
  }
  const text = (key: 'name' | 'role' | 'headline' | 'intro' | 'location' | 'availableNote' | 'about' | 'cvUrl' | 'contactTitle' | 'contactText' | 'contactEmail') => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value),
  })
  /** Edita un elemento de una lista por su id. */
  const patch = <K extends 'stats' | 'journey' | 'services'>(key: K, id: string, next: Partial<Portfolio[K][number]>) =>
    set(key, form[key].map((item) => (item.id === id ? { ...item, ...next } : item)) as Portfolio[K])
  const drop = <K extends 'stats' | 'journey' | 'services'>(key: K, id: string) => set(key, form[key].filter((item) => item.id !== id) as Portfolio[K])

  // Avisa antes de cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const upload = async (file: File, kind: 'avatar' | 'cv') => {
    const limit = kind === 'avatar' ? 15 : 10
    if (file.size > limit * 1024 * 1024) return setMessage({ kind: 'error', text: `El archivo supera ${limit} MB. Usa uno más ligero.` })
    setUploading(kind)
    setMessage(null)
    try {
      const presign = await presignUpload({ filename: file.name, contentType: file.type, size: file.size })
      if (!presign.ok) return setMessage({ kind: 'error', text: presign.error })
      await uploadFile(presign.data, file, () => {})
      const local = URL.createObjectURL(file)
      setForm((f) => (kind === 'avatar' ? { ...f, avatarKey: presign.data.key, avatarUrl: local } : { ...f, cvKey: presign.data.key, cvHref: local }))
    } catch {
      setMessage({ kind: 'error', text: 'No se pudo subir el archivo. Revisa tu conexión e inténtalo de nuevo.' })
    } finally {
      setUploading(null)
    }
  }

  const save = () => {
    startTransition(async () => {
      const res = await updateSite({
        portfolio: {
          ...form,
          stats: form.stats.filter((s) => s.value.trim()),
          journey: form.journey.filter((j) => j.title.trim()),
          services: form.services.filter((s) => s.title.trim()),
          gallery: form.gallery.filter((c) => c.name.trim()),
        },
      })
      if (!res.ok) return setMessage({ kind: 'error', text: res.error })
      setSaved(res.data.portfolio)
      setForm(res.data.portfolio)
      setMessage({ kind: 'ok', text: 'Portafolio guardado. El sitio lo muestra en menos de un minuto.' })
    })
  }

  const counts: Partial<Record<Tab, number>> = { trayectoria: form.journey.length, servicios: form.services.length, galeria: form.gallery.reduce((n, c) => n + c.items.length, 0) }

  return (
    <div className="mt-8">
      <Tabs tabs={TABS.map((t) => ({ ...t, count: counts[t.id] }))} value={tab} onChange={setTab} />

      <div className="bg-surface border-line mt-6 rounded-2xl border p-5 sm:p-7">
        {tab === 'presentacion' && (
          <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nombre" hint="Si lo dejas vacío se usa tu usuario.">
                  <input className="field !bg-bg" {...text('name')} maxLength={60} placeholder="Tu nombre o alias" />
                </Field>
                <Field label="A qué te dedicas">
                  <input className="field !bg-bg" {...text('role')} maxLength={80} placeholder="Programador full stack" />
                </Field>
              </div>
              <Field label="Frase principal" count={form.headline.length} max={140} hint="Una sola idea: qué construyes y para quién.">
                <textarea className="field !bg-bg min-h-20" {...text('headline')} maxLength={140} placeholder="Construyo aplicaciones web completas, de la base de datos a la interfaz." />
              </Field>
              <Field label="Presentación" count={form.intro.length} max={400}>
                <textarea className="field !bg-bg min-h-28" {...text('intro')} maxLength={400} placeholder="Dos o tres líneas que amplían la frase principal." />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Ubicación">
                  <input className="field !bg-bg" {...text('location')} maxLength={80} placeholder="Ciudad, país" />
                </Field>
                <div>
                  <span className="label">Disponibilidad</span>
                  <label className="bg-bg border-line flex items-center gap-3 rounded-xl border px-3.5 py-[0.7rem]">
                    <input type="checkbox" className="accent-accent size-4" checked={form.available} onChange={(e) => set('available', e.target.checked)} />
                    Mostrar que estoy disponible
                  </label>
                </div>
              </div>
              {form.available && (
                <Field label="Texto de disponibilidad" hint="Vacío: “Disponible para nuevos proyectos”.">
                  <input className="field !bg-bg" {...text('availableNote')} maxLength={80} placeholder="Disponible para trabajo remoto" />
                </Field>
              )}

              <div className="border-line border-t pt-5">
                <span className="label">Currículum</span>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="btn" disabled={uploading !== null} onClick={() => cvInput.current?.click()}>
                    {uploading === 'cv' ? 'Subiendo…' : form.cvKey ? 'Reemplazar PDF' : 'Subir PDF'}
                  </button>
                  {form.cvKey && (
                    <>
                      {form.cvHref && (
                        <a href={form.cvHref} target="_blank" rel="noopener noreferrer" className="btn">
                          Ver PDF
                        </a>
                      )}
                      <button type="button" className="btn btn-danger" onClick={() => setForm((f) => ({ ...f, cvKey: null, cvHref: f.cvUrl || null }))}>
                        Quitar PDF
                      </button>
                    </>
                  )}
                  <input ref={cvInput} type="file" accept="application/pdf" hidden onChange={(e) => (e.target.files?.[0] && upload(e.target.files[0], 'cv'), (e.target.value = ''))} />
                </div>
                {!form.cvKey && (
                  <div className="mt-3">
                    <input className="field !bg-bg" type="url" inputMode="url" {...text('cvUrl')} placeholder="O pega un enlace: https://…" aria-label="Enlace al currículum" />
                  </div>
                )}
                <p className="hint">PDF de hasta 10 MB, o un enlace. Aparece como “Descargar CV” junto a tus botones.</p>
              </div>
            </div>

            <div>
              <span className="label">Foto</span>
              <div className="bg-bg border-line flex aspect-square items-center justify-center overflow-hidden rounded-full border">
                {form.avatarUrl ? (
                  <img src={form.avatarUrl} alt="Tu foto" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-dim px-6 text-center text-sm">Sin foto: se muestra el robot del sitio</span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button type="button" className="btn" disabled={uploading !== null} onClick={() => avatarInput.current?.click()}>
                  {uploading === 'avatar' ? 'Subiendo…' : form.avatarKey ? 'Cambiar' : 'Subir foto'}
                </button>
                {form.avatarKey && (
                  <button type="button" className="btn btn-danger" onClick={() => setForm((f) => ({ ...f, avatarKey: null, avatarUrl: null }))}>
                    Quitar
                  </button>
                )}
                <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => (e.target.files?.[0] && upload(e.target.files[0], 'avatar'), (e.target.value = ''))} />
              </div>
              <p className="hint text-center">Cuadrada se ve mejor. Tus habilidades giran a su alrededor.</p>
            </div>
          </div>
        )}

        {tab === 'sobre-mi' && (
          <div className="space-y-7">
            <Field label="Tu historia" count={form.about.length} max={4000} hint="Acepta Markdown: **negrita**, listas y enlaces. Separa los párrafos con una línea en blanco.">
              <textarea className="field !bg-bg min-h-64" {...text('about')} maxLength={4000} placeholder="Cómo empezaste, qué te gusta construir, cómo trabajas." />
            </Field>
            <div>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Cifras</h2>
                  <p className="text-dim text-sm">Números que te describen. Se muestran como círculos junto a tu historia; el primero se destaca.</p>
                </div>
                <button type="button" className="btn" disabled={form.stats.length >= 6} onClick={() => set('stats', [...form.stats, { id: uid(), value: '', label: '' }])}>
                  Añadir cifra
                </button>
              </div>
              <div className="mt-4">
                {form.stats.length === 0 ? (
                  <Empty>Sin cifras. Por ejemplo: “4” años programando, “18” proyectos entregados.</Empty>
                ) : (
                  <SortableList items={form.stats} strategy={verticalListSortingStrategy} onReorder={(next) => set('stats', next)}>
                    <ul className="space-y-2">
                      {form.stats.map((s) => (
                        <Row key={s.id} id={s.id} label={s.label || 'cifra'} onRemove={() => drop('stats', s.id)}>
                          <div className="grid gap-2 sm:grid-cols-[7rem_minmax(0,1fr)]">
                            <input className="field" value={s.value} onChange={(e) => patch('stats', s.id, { value: e.target.value })} maxLength={12} placeholder="18" aria-label="Valor" />
                            <input className="field" value={s.label} onChange={(e) => patch('stats', s.id, { label: e.target.value })} maxLength={40} placeholder="proyectos entregados" aria-label="Qué mide" />
                          </div>
                        </Row>
                      ))}
                    </ul>
                  </SortableList>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'trayectoria' && (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <p className="text-dim max-w-xl text-sm">
                Trabajos, estudios, certificaciones y logros. En el sitio forman un camino que se recorre al bajar, en este mismo orden: pon
                lo más reciente arriba.
              </p>
              <button
                type="button"
                className="btn"
                disabled={form.journey.length >= 30}
                onClick={() => set('journey', [{ id: uid(), kind: 'WORK', title: '', place: '', period: '', text: '', url: '' }, ...form.journey])}
              >
                Añadir etapa
              </button>
            </div>
            <div className="mt-5">
              {form.journey.length === 0 ? (
                <Empty>Aún no hay etapas. Empieza por tu trabajo o estudio más reciente.</Empty>
              ) : (
                <SortableList items={form.journey} strategy={verticalListSortingStrategy} onReorder={(next) => set('journey', next)}>
                  <ul className="space-y-3">
                    {form.journey.map((j) => (
                      <Row key={j.id} id={j.id} label={j.title || 'etapa'} onRemove={() => drop('journey', j.id)}>
                        <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_9rem]">
                          <select className="field" value={j.kind} onChange={(e) => patch('journey', j.id, { kind: e.target.value as JourneyItem['kind'] })} aria-label="Tipo de etapa">
                            {Object.entries(JOURNEY_KINDS).map(([kind, label]) => (
                              <option key={kind} value={kind}>
                                {label}
                              </option>
                            ))}
                          </select>
                          <input className="field" value={j.title} onChange={(e) => patch('journey', j.id, { title: e.target.value })} maxLength={80} placeholder="Puesto, carrera o logro" aria-label="Título" />
                          <input className="field" value={j.period} onChange={(e) => patch('journey', j.id, { period: e.target.value })} maxLength={40} placeholder="2024 - hoy" aria-label="Periodo" />
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <input className="field" value={j.place} onChange={(e) => patch('journey', j.id, { place: e.target.value })} maxLength={80} placeholder="Empresa o institución" aria-label="Lugar" />
                          <input className="field" type="url" inputMode="url" value={j.url} onChange={(e) => patch('journey', j.id, { url: e.target.value })} placeholder="Enlace (opcional): https://…" aria-label="Enlace" />
                        </div>
                        <textarea className="field mt-2 min-h-20" value={j.text} onChange={(e) => patch('journey', j.id, { text: e.target.value })} maxLength={600} placeholder="Qué hiciste y qué lograste (opcional)" aria-label="Descripción" />
                      </Row>
                    ))}
                  </ul>
                </SortableList>
              )}
            </div>
          </div>
        )}

        {tab === 'galeria' && <GalleryEditor value={form.gallery} onChange={(next) => set('gallery', next)} onError={(text) => setMessage({ kind: 'error', text })} />}

        {tab === 'servicios' && (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <p className="text-dim max-w-xl text-sm">Lo que alguien puede encargarte. En el sitio la sección se titula “En qué puedo ayudarte”.</p>
              <button type="button" className="btn" disabled={form.services.length >= 8} onClick={() => set('services', [...form.services, { id: uid(), title: '', text: '' }])}>
                Añadir servicio
              </button>
            </div>
            <div className="mt-5">
              {form.services.length === 0 ? (
                <Empty>Sin servicios. Si solo buscas empleo puedes dejar esta sección vacía.</Empty>
              ) : (
                <SortableList items={form.services} strategy={verticalListSortingStrategy} onReorder={(next) => set('services', next)}>
                  <ul className="space-y-3">
                    {form.services.map((s) => (
                      <Row key={s.id} id={s.id} label={s.title || 'servicio'} onRemove={() => drop('services', s.id)}>
                        <input className="field" value={s.title} onChange={(e) => patch('services', s.id, { title: e.target.value })} maxLength={60} placeholder="Aplicaciones web a medida" aria-label="Servicio" />
                        <textarea className="field mt-2 min-h-20" value={s.text} onChange={(e) => patch('services', s.id, { text: e.target.value })} maxLength={300} placeholder="Qué incluye y qué recibe el cliente" aria-label="Descripción" />
                      </Row>
                    ))}
                  </ul>
                </SortableList>
              )}
            </div>
          </div>
        )}

        {tab === 'contacto' && (
          <div className="max-w-2xl space-y-5">
            <Field label="Título" hint="Vacío: “¿Construimos algo juntos?”.">
              <input className="field !bg-bg" {...text('contactTitle')} maxLength={100} placeholder="¿Construimos algo juntos?" />
            </Field>
            <Field label="Mensaje" count={form.contactText.length} max={300}>
              <textarea className="field !bg-bg min-h-24" {...text('contactText')} maxLength={300} placeholder="Cuéntame qué necesitas y te respondo en cuanto pueda." />
            </Field>
            <Field label="Correo de contacto" hint="Vacío: se usa el correo de tus redes sociales, si lo tienes.">
              <input className="field !bg-bg" type="email" inputMode="email" {...text('contactEmail')} maxLength={200} placeholder="tu@correo.com" />
            </Field>
            <p className="text-dim text-sm">
              Los iconos de tus redes aparecen debajo. Se editan en{' '}
              <Link href="/settings" className="text-ink underline underline-offset-2">
                Ajustes
              </Link>
              .
            </p>
          </div>
        )}
      </div>

      <div className="bg-raised border-line sticky bottom-4 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-2xl sm:px-5">
        <p role="status" className={`min-w-0 text-sm ${message?.kind === 'error' ? 'text-danger' : message ? 'text-accent' : 'text-dim'}`}>
          {message?.text ?? (dirty ? 'Tienes cambios sin guardar.' : 'Todo guardado.')}
        </p>
        <div className="flex gap-2">
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="btn">
              Ver en el sitio
            </a>
          )}
          <button type="button" className="btn btn-primary" onClick={save} disabled={pending || uploading !== null || !dirty}>
            {pending ? 'Guardando…' : 'Guardar portafolio'}
          </button>
        </div>
      </div>
    </div>
  )
}
