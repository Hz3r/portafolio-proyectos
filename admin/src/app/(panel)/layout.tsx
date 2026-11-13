import Link from 'next/link'
import { logout } from '@/app/actions'

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const siteUrl = process.env.SITE_URL
  return (
    <div className="mx-auto w-full max-w-4xl px-5 pb-24 sm:px-8">
      <header className="border-line flex items-center justify-between border-b py-5">
        <Link href="/" className="pixel text-accent py-2">
          Panel
        </Link>
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
