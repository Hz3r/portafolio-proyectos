import type { Tag } from '@/lib/types'

/** Icono de una etiqueta: trazo prediseñado, imagen subida o nada. */
export function TagIcon({ tag, size = 16 }: { tag: Pick<Tag, 'iconPath' | 'iconUrl' | 'color'>; size?: number }) {
  if (tag.iconUrl) {
    return <img src={tag.iconUrl} alt="" width={size} height={size} className="shrink-0 rounded-[3px] object-contain" style={{ width: size, height: size }} />
  }
  if (tag.iconPath) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={tag.color ?? 'currentColor'} className="shrink-0" aria-hidden="true">
        <path d={tag.iconPath} />
      </svg>
    )
  }
  return null
}

export function TagChip({ tag, children }: { tag: Tag; children?: React.ReactNode }) {
  return (
    <span className="border-line bg-surface inline-flex items-center gap-2 rounded-full border py-1.5 pr-3 pl-2.5 text-sm">
      <TagIcon tag={tag} />
      {tag.name}
      {children}
    </span>
  )
}

export function Toggle({
  on,
  onChange,
  label,
  showLabel = true,
}: {
  on: boolean
  onChange: () => void
  label: string
  showLabel?: boolean
}) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onChange} className="flex shrink-0 items-center gap-2.5 py-2">
      <span className={`pixel ${showLabel ? '' : 'hidden sm:block'} ${on ? 'text-accent' : 'text-dim'}`}>
        {on ? 'Publicado' : 'Borrador'}
      </span>
      <span className={`relative h-6 w-10 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-line'}`}>
        <span className={`bg-bg absolute top-1 left-1 size-4 rounded-full transition-transform ${on ? 'translate-x-4' : ''}`} />
      </span>
    </button>
  )
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[]
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div role="tablist" className="border-line flex gap-1 overflow-x-auto border-b">
      {tabs.map((t) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-[0.9375rem] font-medium transition-colors ${
              active ? 'border-accent text-ink' : 'text-dim hover:text-ink border-transparent'
            }`}
          >
            {t.label}
            {t.count !== undefined && <span className={`pixel ${active ? 'text-accent' : ''}`}>{t.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
