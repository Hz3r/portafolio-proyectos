'use client'

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  type SortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useId } from 'react'

type Handle = { ref: (el: HTMLElement | null) => void; props: Record<string, unknown> }

/** Lista ordenable arrastrando (ratón, tacto y teclado). */
export function SortableList<T extends { id: string }>({
  items,
  strategy,
  onReorder,
  children,
}: {
  items: T[]
  strategy: SortingStrategy
  onReorder: (items: T[]) => void
  children: React.ReactNode
}) {
  const id = useId()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = items.findIndex((i) => i.id === active.id)
    const to = items.findIndex((i) => i.id === over.id)
    if (from >= 0 && to >= 0) onReorder(arrayMove(items, from, to))
  }
  return (
    <DndContext id={id} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items} strategy={strategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

export function SortableItem({
  id,
  className,
  children,
}: {
  id: string
  className?: string
  children: (handle: Handle, dragging: boolean) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <li
      ref={setNodeRef}
      className={className}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
        position: 'relative',
      }}
    >
      {children({ ref: setActivatorNodeRef, props: { ...attributes, ...listeners } }, isDragging)}
    </li>
  )
}

export function Grip() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">
      {[0, 6, 12].flatMap((y) => [0, 6].map((x) => <rect key={`${x}${y}`} x={x} y={y} width="4" height="4" />))}
    </svg>
  )
}
