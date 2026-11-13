import Link from 'next/link'
import { notFound } from 'next/navigation'
import MediaManager from '@/components/MediaManager'
import ProjectForm from '@/components/ProjectForm'
import { admin } from '@/lib/api'
import type { Project } from '@/lib/types'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await admin<Project>(`/projects/${id}`)
  if (!res.ok) {
    if (res.error === 'No encontrado') notFound()
    return (
      <p role="alert" className="border-danger/40 text-danger mt-10 rounded-2xl border p-5">
        {res.error}
      </p>
    )
  }
  const project = res.data

  return (
    <main className="pt-8">
      <Link href="/" className="text-dim hover:text-ink inline-block py-2 text-sm">
        <span aria-hidden="true">◀</span> Todos los proyectos
      </Link>
      <ProjectForm project={project} siteUrl={process.env.SITE_URL ?? null} />
      <MediaManager projectId={project.id} initial={project.media} initialCoverId={project.cover?.id ?? null} />
    </main>
  )
}
