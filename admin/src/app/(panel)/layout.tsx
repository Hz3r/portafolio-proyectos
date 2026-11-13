import { logout } from '@/app/actions'
import NavLinks from '@/components/NavLinks'

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const siteUrl = process.env.SITE_URL?.replace(/\/$/, '')
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="border-line bg-bg/90 sticky top-0 z-20 border-b px-5 py-3 backdrop-blur lg:flex lg:h-dvh lg:flex-col lg:border-r lg:border-b-0 lg:px-4 lg:py-6">
        <div className="flex items-center justify-between gap-4 lg:block">
          <p className="pixel text-accent lg:px-3.5 lg:pb-6">Panel del portafolio</p>
          <form action={logout} className="lg:hidden">
            <button className="text-dim hover:text-ink py-1 text-sm">Salir</button>
          </form>
        </div>
        <div className="mt-2 lg:mt-0 lg:flex-1">
          <NavLinks />
        </div>
        <div className="border-line hidden space-y-1 border-t pt-4 lg:block">
          {siteUrl && (
            <>
              <a href={`${siteUrl}/portafolio`} target="_blank" rel="noopener noreferrer" className="text-dim hover:text-ink block rounded-xl px-3.5 py-2 text-sm">
                Ver el portafolio
              </a>
              <a href={`${siteUrl}/proyectos`} target="_blank" rel="noopener noreferrer" className="text-dim hover:text-ink block rounded-xl px-3.5 py-2 text-sm">
                Ver los proyectos
              </a>
            </>
          )}
          <form action={logout}>
            <button className="text-dim hover:text-danger w-full rounded-xl px-3.5 py-2 text-left text-sm">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <div className="mx-auto w-full max-w-6xl px-5 pb-28 sm:px-8">{children}</div>
    </div>
  )
}
