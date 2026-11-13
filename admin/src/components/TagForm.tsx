'use client'

import { useRef, useState } from 'react'
import { createTag, presignUpload, updateTag } from '@/app/actions'
import type { IconHit } from '@/lib/icons'
import type { Tag } from '@/lib/types'
import { uploadFile } from '@/lib/upload'
import IconPicker from './IconPicker'
import { TagIcon } from './ui'

type Draft = { name: string; iconPath: string | null; color: string | null; file: File | null; iconUrl: string | null }
const ICON_TYPES = 'image/svg+xml,image/png,image/webp,image/jpeg'

/** Crea o edita una etiqueta: nombre libre, icono de la librería o imagen propia. */
export default function TagForm({
  tag,
  initialName = '',
  featured,
  total,
  onSaved,
  onCancel,
}: {
  tag?: Tag | null
  initialName?: string
  featured: IconHit[]
  total: number
  onSaved: (tag: Tag) => void
  onCancel?: () => void
}) {
  const [draft, setDraft] = useState<Draft>({
    name: tag?.name ?? initialName,
    iconPath: tag?.iconPath ?? null,
    color: tag?.color ?? null,
    file: null,
    iconUrl: tag?.iconUrl ?? null,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const preview = draft.file ? URL.createObjectURL(draft.file) : draft.iconUrl
  const hasIcon = !!(preview || draft.iconPath)

  const save = async () => {
    if (!draft.name.trim()) return setError('Escribe un nombre.')
    setError(null)
    setBusy(true)
    try {
      let iconKey: string | null | undefined
      if (draft.file) {
        const presign = await presignUpload({ filename: draft.file.name, contentType: draft.file.type, size: draft.file.size })
        if (!presign.ok) return setError(presign.error)
        await uploadFile(presign.data, draft.file, () => {})
        iconKey = presign.data.key
      } else if (!draft.iconUrl) {
        iconKey = null
      }
      const image = !!(draft.file || draft.iconUrl)
      const input = {
        name: draft.name,
        iconPath: image ? null : draft.iconPath,
        color: image ? null : draft.color,
        ...(iconKey !== undefined ? { iconKey } : {}),
      }
      const res = tag ? await updateTag(tag.id, input) : await createTag(input)
      if (!res.ok) return setError(res.error)
      onSaved(res.data)
    } catch {
      setError('No se pudo subir el icono. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex items-end gap-3">
        <span className="bg-bg border-line flex size-[2.875rem] shrink-0 items-center justify-center rounded-xl border">
          {hasIcon ? (
            <TagIcon tag={{ iconPath: draft.iconPath, iconUrl: preview, color: draft.color }} size={22} />
          ) : (
            <span className="text-dim text-[0.6875rem]">Sin icono</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <label className="label" htmlFor="tag-name">
            Nombre
          </label>
          <input
            id="tag-name"
            className="field !bg-bg"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), save())}
            maxLength={30}
            placeholder="Astro, Web, Mi framework…"
          />
        </div>
      </div>

      <p className="label mt-5">Icono</p>
      <IconPicker
        featured={featured}
        total={total}
        selected={draft.file || draft.iconUrl ? null : draft.iconPath}
        // Elegir un icono propone su nombre si aún no escribiste uno.
        onPick={(hit) =>
          setDraft((d) => ({ ...d, name: d.name.trim() ? d.name : hit.name, iconPath: hit.iconPath, color: hit.color, file: null, iconUrl: null }))
        }
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="btn !py-1.5 text-sm" onClick={() => fileInput.current?.click()}>
          Subir mi imagen
        </button>
        {hasIcon && (
          <button type="button" className="btn text-dim !py-1.5 text-sm" onClick={() => setDraft({ ...draft, iconPath: null, color: null, file: null, iconUrl: null })}>
            Quitar icono
          </button>
        )}
        <span className="text-dim text-xs">SVG o PNG cuadrado, hasta 1 MB</span>
        <input
          ref={fileInput}
          type="file"
          accept={ICON_TYPES}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            if (file.size > 1024 * 1024) return setError('El icono supera 1 MB. Usa una imagen más ligera.')
            setError(null)
            setDraft({ ...draft, file, iconPath: null, color: null, iconUrl: null })
          }}
        />
      </div>

      {error && (
        <p role="alert" className="text-danger mt-4 text-sm">
          {error}
        </p>
      )}
      <div className="mt-5 flex gap-2">
        <button type="button" className="btn btn-primary" onClick={save} disabled={busy || !draft.name.trim()}>
          {busy ? 'Guardando…' : tag ? 'Guardar etiqueta' : 'Crear etiqueta'}
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
