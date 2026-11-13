import type { Tag } from '../lib/api'

export function TagIcon({ tag, size = 14 }: { tag: Tag; size?: number }) {
  if (tag.iconUrl) {
    return <img src={tag.iconUrl} alt="" width={size} height={size} loading="lazy" className="shrink-0 rounded-[3px] object-contain" style={{ width: size, height: size }} />
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

/** Etiqueta con su icono. `plain` la muestra sin borde, para las tarjetas. */
export default function TagBadge({ tag, plain = false }: { tag: Tag; plain?: boolean }) {
  return (
    <span
      className={
        plain
          ? 'text-dim inline-flex items-center gap-1.5 text-[0.8125rem]'
          : 'border-line bg-surface text-ink inline-flex items-center gap-2 rounded-full border py-1.5 pr-3 pl-2.5 text-sm'
      }
    >
      <TagIcon tag={tag} size={plain ? 13 : 15} />
      {tag.name}
    </span>
  )
}
