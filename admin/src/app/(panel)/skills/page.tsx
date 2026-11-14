import SkillsManager from '@/components/SkillsManager'
import { admin } from '@/lib/api'
import type { Tag } from '@/lib/types'

export default async function SkillsPage() {
  const res = await admin<Tag[]>('/tags')
  return (
    <main className="pt-10">
      <h1 className="text-3xl font-semibold tracking-tight">Habilidades</h1>
      <p className="text-dim mt-2 max-w-2xl">
        Lo que sabes hacer, por área y por nivel. El portafolio las muestra en órbitas: cuanto más cerca del centro, más la dominas. Las que usas
        en proyectos publicados llevan a esos proyectos.
      </p>
      {res.ok ? (
        <SkillsManager initial={res.data} siteUrl={process.env.SITE_URL ?? null} />
      ) : (
        <p role="alert" className="border-danger/40 text-danger mt-8 rounded-2xl border p-5">
          {res.error}
        </p>
      )}
    </main>
  )
}
