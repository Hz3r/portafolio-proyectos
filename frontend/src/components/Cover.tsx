import type { Project } from '../lib/api'
import { stillOf } from '../lib/api'

/** Portada de un proyecto, o un patrón pixel con sus iniciales si no tiene imagen. */
export default function Cover({ project, eager = false }: { project: Project; eager?: boolean }) {
  const src = stillOf(project.cover)
  if (!src) {
    const initials = project.title
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
    return (
      <div
        className="cover-img flex h-full w-full items-center justify-center"
        style={{
          backgroundImage:
            'linear-gradient(45deg, #171722 25%, transparent 25%, transparent 75%, #171722 75%), linear-gradient(45deg, #171722 25%, transparent 25%, transparent 75%, #171722 75%)',
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 8px 8px',
        }}
      >
        <span className="font-pixel text-dim text-3xl uppercase">{initials}</span>
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={project.cover?.alt || ''}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className="cover-img h-full w-full object-cover"
    />
  )
}
