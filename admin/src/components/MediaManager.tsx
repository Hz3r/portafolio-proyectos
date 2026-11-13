'use client'

import { rectSortingStrategy } from '@dnd-kit/sortable'
import { useRef, useState } from 'react'
import { addMedia, deleteMedia, presignUpload, reorderMedia, updateMedia, updateProject } from '@/app/actions'
import type { Media } from '@/lib/types'
import { imageSize, uploadFile, videoPoster } from '@/lib/upload'
import { Grip, SortableItem, SortableList } from './Sortable'

type Upload = { id: string; name: string; progress: number; error?: string }

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm'
const MB = 1024 * 1024

export default function MediaManager({
  projectId,
  initial,
  initialCoverId,
}: {
  projectId: string
  initial: Media[]
  initialCoverId: string | null
}) {
  const [media, setMedia] = useState(initial)
  const [coverId, setCoverId] = useState(initialCoverId)
  const [uploads, setUploads] = useState<Upload[]>([])
  const [error, setError] = useState<string | null>(null)
  const [over, setOver] = useState(false)
  const [embed, setEmbed] = useState('')
  const [embedBusy, setEmbedBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const patchUpload = (id: string, patch: Partial<Upload>) =>
    setUploads((list) => list.map((u) => (u.id === id ? { ...u, ...patch } : u)))

  async function uploadOne(file: File) {
    const id = crypto.randomUUID()
    setUploads((list) => [...list, { id, name: file.name, progress: 0 }])
    const fail = (message: string) => patchUpload(id, { error: message })

    const isVideo = file.type.startsWith('video/')
    if (!ACCEPT.split(',').includes(file.type)) return fail('Formato no permitido. Usa jpg, png, webp, avif, gif, mp4 o webm.')
    const limit = isVideo ? 500 : 15
    if (file.size > limit * MB) return fail(`Supera el límite de ${limit} MB.`)

    try {
      const presign = await presignUpload({ filename: file.name, contentType: file.type, size: file.size })
      if (!presign.ok) return fail(presign.error)
      await uploadFile(presign.data, file, (progress) => patchUpload(id, { progress }))

      let res
      if (isVideo) {
        const info = await videoPoster(file)
        let posterKey: string | null = null
        if (info?.poster) {
          const p = await presignUpload({ filename: 'poster.jpg', contentType: 'image/jpeg', size: info.poster.size })
          if (p.ok) {
            await uploadFile(p.data, info.poster, () => {})
            posterKey = p.data.key
          }
        }
        res = await addMedia(projectId, { type: 'VIDEO', key: presign.data.key, posterKey, width: info?.width, height: info?.height })
      } else {
        const size = await imageSize(file)
        res = await addMedia(projectId, { type: 'IMAGE', key: presign.data.key, ...size })
      }
      if (!res.ok) return fail(res.error)
      const created = res.data
      setMedia((list) => [...list, created])
      setCoverId((current) => current ?? (created.type === 'IMAGE' || created.posterUrl ? created.id : null))
      setUploads((list) => list.filter((u) => u.id !== id))
    } catch {
      fail('No se pudo subir. Revisa tu conexión e inténtalo de nuevo.')
    }
  }

  // De dos en dos, para no saturar la conexión con videos grandes.
  async function uploadAll(files: File[]) {
    setError(null)
    const queue = [...files]
    const worker = async () => {
      for (let file = queue.shift(); file; file = queue.shift()) await uploadOne(file)
    }
    await Promise.all([worker(), worker()])
  }

  const reorder = async (next: Media[]) => {
    const before = media
    setMedia(next)
    const res = await reorderMedia(projectId, next.map((m) => m.id))
    if (!res.ok) {
      setMedia(before)
      setError(`No se guardó el orden. ${res.error}`)
    }
  }

  const remove = async (m: Media) => {
    if (!confirm('¿Borrar este archivo? No se puede deshacer.')) return
    const res = await deleteMedia(m.id)
    if (!res.ok) return setError(res.error)
    const rest = media.filter((x) => x.id !== m.id)
    setMedia(rest)
    if (coverId === m.id) setCoverId(rest.find((x) => x.type === 'IMAGE' || x.posterUrl)?.id ?? null)
  }

  const makeCover = async (m: Media) => {
    const before = coverId
    setCoverId(m.id)
    const res = await updateProject(projectId, { coverMediaId: m.id })
    if (!res.ok) {
      setCoverId(before)
      setError(res.error)
    }
  }

  const saveAlt = async (m: Media, alt: string) => {
    if (alt === m.alt) return
    const res = await updateMedia(m.id, { alt })
    if (!res.ok) return setError(res.error)
    setMedia((list) => list.map((x) => (x.id === m.id ? { ...x, alt } : x)))
  }

  const addEmbed = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!embed.trim()) return
    setEmbedBusy(true)
    setError(null)
    const res = await addMedia(projectId, { type: 'EMBED', embedUrl: embed.trim() })
    setEmbedBusy(false)
    if (!res.ok) return setError(res.error)
    setMedia((list) => [...list, res.data])
    setEmbed('')
  }

  return (
    <section className="mt-14" aria-labelledby="media-title">
      <h2 id="media-title" className="text-xl font-semibold tracking-tight">
        Imágenes y videos
      </h2>
      <p className="text-dim mt-1.5 text-sm">
        Se guardan al instante. Arrastra para ordenar; la portada es la que se ve en la lista de proyectos.
      </p>

      <div
        onDragOver={(e) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          uploadAll([...e.dataTransfer.files])
        }}
        className={`mt-5 rounded-2xl border border-dashed px-6 py-9 text-center transition-colors ${
          over ? 'border-accent bg-accent/5' : 'border-line'
        }`}
      >
        <p className="font-medium">Arrastra archivos aquí</p>
        <p className="text-dim mt-1.5 text-sm">Imágenes hasta 15 MB (jpg, png, webp, avif, gif). Videos hasta 500 MB (mp4, webm).</p>
        <button type="button" className="btn mt-5" onClick={() => input.current?.click()}>
          Elegir archivos
        </button>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            uploadAll([...(e.target.files ?? [])])
            e.target.value = ''
          }}
        />
      </div>

      <form onSubmit={addEmbed} className="mt-4 flex gap-2">
        <input
          className="field"
          value={embed}
          onChange={(e) => setEmbed(e.target.value)}
          placeholder="O pega un enlace de YouTube o Vimeo"
          aria-label="Enlace de YouTube o Vimeo"
        />
        <button className="btn" disabled={embedBusy || !embed.trim()}>
          {embedBusy ? 'Añadiendo…' : 'Añadir video'}
        </button>
      </form>

      {error && (
        <p role="alert" className="text-danger mt-4 text-sm">
          {error}
        </p>
      )}

      {uploads.length > 0 && (
        <ul className="mt-5 space-y-2">
          {uploads.map((u) => (
            <li key={u.id} className="bg-surface border-line rounded-xl border px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="min-w-0 truncate">{u.name}</span>
                {u.error ? (
                  <button
                    type="button"
                    className="text-dim hover:text-ink shrink-0"
                    onClick={() => setUploads((list) => list.filter((x) => x.id !== u.id))}
                  >
                    Quitar
                  </button>
                ) : (
                  <span className="pixel text-accent shrink-0">{Math.round(u.progress * 100)}%</span>
                )}
              </div>
              {u.error ? (
                <p className="text-danger mt-1.5">{u.error}</p>
              ) : (
                <div className="bg-line mt-2.5 h-1 overflow-hidden rounded-full">
                  <div className="bg-accent h-full transition-[width]" style={{ width: `${u.progress * 100}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <SortableList items={media} strategy={rectSortingStrategy} onReorder={reorder}>
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {media.map((m) => {
            const still = m.type === 'IMAGE' ? m.url : m.posterUrl
            const isCover = m.id === coverId
            return (
              <SortableItem key={m.id} id={m.id}>
                {(handle, dragging) => (
                  <div
                    className={`bg-surface overflow-hidden rounded-2xl border ${
                      dragging ? 'border-accent shadow-2xl' : isCover ? 'border-accent/60' : 'border-line'
                    }`}
                  >
                    <div className="bg-raised relative aspect-[16/10]">
                      {still ? (
                        <img src={still} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="text-dim flex h-full items-center justify-center px-3 text-center text-sm break-all">
                          {m.type === 'EMBED' ? m.embedUrl?.replace('https://', '') : 'Video sin miniatura'}
                        </div>
                      )}
                      <button
                        type="button"
                        ref={handle.ref}
                        {...handle.props}
                        className="bg-bg/80 text-ink absolute top-2 left-2 touch-none rounded-lg p-2.5 backdrop-blur"
                        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
                        aria-label="Mover"
                      >
                        <Grip />
                      </button>
                      <span className="pixel bg-bg/80 absolute top-2 right-2 rounded-lg px-2 py-2 backdrop-blur">
                        {isCover ? <span className="text-accent">Portada</span> : m.type === 'IMAGE' ? 'Imagen' : 'Video'}
                      </span>
                    </div>
                    <div className="space-y-2.5 p-3">
                      {m.type !== 'EMBED' && (
                        <input
                          className="field !rounded-lg !px-2.5 !py-1.5 text-sm"
                          defaultValue={m.alt}
                          placeholder="Describe lo que se ve"
                          aria-label="Texto alternativo"
                          onBlur={(e) => saveAlt(m, e.target.value.trim())}
                        />
                      )}
                      <div className="flex items-center justify-between text-sm">
                        {still && !isCover ? (
                          <button type="button" className="text-dim hover:text-accent py-1" onClick={() => makeCover(m)}>
                            Usar de portada
                          </button>
                        ) : (
                          <span />
                        )}
                        <button type="button" className="text-dim hover:text-danger py-1" onClick={() => remove(m)}>
                          Borrar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </SortableItem>
            )
          })}
        </ul>
      </SortableList>
    </section>
  )
}
