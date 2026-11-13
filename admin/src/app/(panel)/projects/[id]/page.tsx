import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProjectEditor from '@/components/ProjectEditor'
import { admin } from '@/lib/api'
import { findIcons, ICON_COUNT } from '@/lib/icons'
import type { Project, Tag } from '@/lib/types'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [res, tags] = await Promise.all([admin<Project>(`/projects/${id}`), admin<Tag[]>('/tags')])
  if (!res.ok) {
    if (res.error === 'No encontrado') notFound()
    return (
      <p role="alert" className="border-danger/40 text-danger mt-10 rounded-2xl border p-5">
        {res.error}
      </p>
    )
  }

  return (
    <main className="pt-8">
      <Link href="/projects" className="text-dim hover:text-ink inline-block py-2 text-sm">
        <span aria-hidden="true">◀</span> Todos los proyectos
      </Link>
      <ProjectEditor project={res.data} allTags={tags.ok ? tags.data : []} siteUrl={process.env.SITE_URL ?? null} featured={findIcons('')} iconTotal={ICON_COUNT} />
    </main>
  )
}
