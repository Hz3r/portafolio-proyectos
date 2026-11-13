import { logout } from '@/app/actions'
import NavLinks from '@/components/NavLinks'

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const siteUrl = process.env.SITE_URL
  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
      <header className="border-line flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b py-4">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <span className="pixel text-accent">Panel</span>
          <NavLinks />
        </div>
        <div className="flex items-center gap-2">
          {siteUrl && (
            <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="btn text-sm">
              Ver el sitio
            </a>
          )}
          <form action={logout}>
            <button className="btn text-dim text-sm">Salir</button>
          </form>
        </div>
      </header>
      {children}
    </div>
  )
}
