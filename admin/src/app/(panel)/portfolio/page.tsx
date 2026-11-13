import { readSite } from '@/app/actions'
import PortfolioEditor from '@/components/PortfolioEditor'

export default async function PortfolioPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [site, { tab }] = await Promise.all([readSite(), searchParams])
  const siteUrl = process.env.SITE_URL?.replace(/\/$/, '') ?? null
  return (
    <main className="pt-10">
      <h1 className="text-3xl font-semibold tracking-tight">Portafolio</h1>
      <p className="text-dim mt-2 max-w-2xl">
        El contenido de tu página completa. Lo que dejes vacío no aparece, así que puedes publicarla por partes. Las habilidades, los
        proyectos y las redes se toman de sus propias secciones.
      </p>
      {site ? (
        <PortfolioEditor initial={site.portfolio} initialTab={tab} previewUrl={siteUrl && `${siteUrl}/portafolio`} />
      ) : (
        <p role="alert" className="border-danger/40 text-danger mt-8 rounded-2xl border p-5">
          No se pudo cargar el portafolio. Recarga la página.
        </p>
      )}
    </main>
  )
}
