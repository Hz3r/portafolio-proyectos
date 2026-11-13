import { createProject } from '@/app/actions'
import ProjectList from '@/components/ProjectList'
import { admin } from '@/lib/api'
import type { Project } from '@/lib/types'

export default async function ProjectsPage() {
  const res = await admin<Project[]>('/projects')
  const projects = res.ok ? res.data : []
  const published = projects.filter((p) => p.status === 'PUBLISHED').length
  const stats = [
    { label: 'Proyectos', value: projects.length },
    { label: 'Publicados', value: published },
    { label: 'Borradores', value: projects.length - published },
    { label: 'Privados', value: projects.filter((p) => !p.url).length },
  ]

  return (
    <main className="pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Proyectos</h1>
        <form action={createProject}>
          <button className="btn btn-primary">Nuevo proyecto</button>
        </form>
      </div>

      {!res.ok ? (
        <p role="alert" className="border-danger/40 text-danger mt-8 rounded-2xl border p-5">
          {res.error}
        </p>
      ) : projects.length === 0 ? (
        <div className="border-line mt-8 rounded-2xl border border-dashed px-6 py-16 text-center">
          <p className="text-lg font-medium">Aún no hay proyectos</p>
          <p className="text-dim mt-2">Crea el primero con el botón “Nuevo proyecto”.</p>
        </div>
      ) : (
        <>
          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-surface border-line rounded-2xl border px-4 py-4">
                <dt className="pixel text-dim">{s.label}</dt>
                <dd className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
          <ProjectList initial={projects} />
        </>
      )}
    </main>
  )
}
