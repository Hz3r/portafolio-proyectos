import Link from 'next/link'
import { createProject, readSite } from '@/app/actions'
import CopyLink from '@/components/CopyLink'
import { admin } from '@/lib/api'
import type { Project, Tag } from '@/lib/types'

export default async function DashboardPage() {
  const [projects, tags, site] = await Promise.all([admin<Project[]>('/projects'), admin<Tag[]>('/tags'), readSite()])
  const siteUrl = process.env.SITE_URL?.replace(/\/$/, '') ?? null
  if (!projects.ok || !tags.ok || !site) {
    return (
      <main className="pt-10">
        <h1 className="text-3xl font-semibold tracking-tight">Resumen</h1>
        <p role="alert" className="border-danger/40 text-danger mt-8 rounded-2xl border p-5">
          {!projects.ok ? projects.error : !tags.ok ? tags.error : 'No se pudo cargar el sitio. Recarga la página.'}
        </p>
      </main>
    )
  }

  const p = site.portfolio
  const published = projects.data.filter((x) => x.status === 'PUBLISHED').length
  const skills = tags.data.filter((t) => t.skill).length
  const hasEmail = !!p.contactEmail || site.socials.some((s) => s.kind === 'email')

  // Qué le falta al portafolio, con el enlace al lugar exacto donde se llena.
  const steps = [
    { done: !!(p.name || site.handle) && !!(p.role || site.tagline), label: 'Nombre y a qué te dedicas', href: '/portfolio?tab=presentacion' },
    { done: !!p.headline, label: 'Frase principal', href: '/portfolio?tab=presentacion' },
    { done: !!p.avatarKey, label: 'Foto', href: '/portfolio?tab=presentacion' },
    { done: !!p.about, label: 'Tu historia en “Sobre mí”', href: '/portfolio?tab=sobre-mi' },
    { done: skills >= 3, label: 'Al menos 3 habilidades', href: '/skills' },
    { done: published >= 1, label: 'Un proyecto publicado', href: '/projects' },
    { done: p.journey.length >= 1, label: 'Una etapa en tu trayectoria', href: '/portfolio?tab=trayectoria' },
    { done: hasEmail, label: 'Correo de contacto', href: '/portfolio?tab=contacto' },
    { done: site.socials.length >= 1, label: 'Una red social', href: '/settings' },
    { done: !!p.cvHref, label: 'Currículum', href: '/portfolio?tab=presentacion' },
  ]
  const done = steps.filter((s) => s.done).length
  const percent = Math.round((done / steps.length) * 100)
  const pending = steps.filter((s) => !s.done)

  const stats = [
    { label: 'Proyectos publicados', value: published, href: '/projects' },
    { label: 'Borradores', value: projects.data.length - published, href: '/projects' },
    { label: 'Habilidades', value: skills, href: '/skills' },
    { label: 'Etapas de trayectoria', value: p.journey.length, href: '/portfolio?tab=trayectoria' },
  ]
  const pages = [
    { name: 'Portafolio completo', path: '/portafolio', home: site.home === 'PORTFOLIO', hint: 'Para LinkedIn, tu CV o GitHub.' },
    { name: 'Solo proyectos', path: '/proyectos', home: site.home === 'PROJECTS', hint: 'Para Instagram o TikTok: directo al trabajo.' },
  ]

  return (
    <main className="pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Resumen</h1>
        <div className="flex gap-2">
          <Link href="/portfolio" className="btn">
            Editar portafolio
          </Link>
          <form action={createProject}>
            <button className="btn btn-primary">Nuevo proyecto</button>
          </form>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="bg-surface border-line hover:border-dim rounded-2xl border px-4 py-4 transition-colors">
            <dt className="text-dim text-sm">{s.label}</dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{s.value}</dd>
          </Link>
        ))}
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <section className="bg-surface border-line rounded-2xl border p-5 sm:p-6" aria-labelledby="progress">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="progress" className="text-lg font-semibold">
              Tu portafolio está al {percent} %
            </h2>
            <span className="pixel text-accent">
              {done}/{steps.length}
            </span>
          </div>
          <div className="bg-line mt-4 h-2 overflow-hidden rounded-full" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-labelledby="progress">
            <div className="bg-accent h-full rounded-full" style={{ width: `${percent}%` }} />
          </div>
          {pending.length === 0 ? (
            <p className="text-dim mt-5 text-sm">Está completo. Lo que sigue es mantenerlo al día con cada proyecto nuevo.</p>
          ) : (
            <>
              <p className="text-dim mt-5 text-sm">Lo que falta. Nada es obligatorio: lo vacío simplemente no se muestra.</p>
              <ul className="mt-3 space-y-1.5">
                {pending.map((s) => (
                  <li key={s.label}>
                    <Link href={s.href} className="bg-bg border-line hover:border-accent flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors">
                      {s.label}
                      <span className="text-accent font-medium">Completar</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="bg-surface border-line rounded-2xl border p-5 sm:p-6" aria-labelledby="links">
          <h2 id="links" className="text-lg font-semibold">
            Enlaces para compartir
          </h2>
          <p className="text-dim mt-1 text-sm">Cada página tiene su enlace fijo. Usa el que convenga en cada red.</p>
          <ul className="mt-4 space-y-3">
            {pages.map((page) => (
              <li key={page.path} className="bg-bg border-line rounded-xl border p-4">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {page.name}
                  {page.home && <span className="pixel text-accent">Página de inicio</span>}
                </p>
                <p className="text-dim text-sm">{page.hint}</p>
                <CopyLink url={siteUrl ? `${siteUrl}${page.path}` : page.path} canCopy={!!siteUrl} />
              </li>
            ))}
          </ul>
          <p className="text-dim mt-4 text-sm">
            La página de inicio se cambia en{' '}
            <Link href="/settings" className="text-ink underline underline-offset-2">
              Ajustes
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
