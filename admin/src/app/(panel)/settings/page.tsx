import { readSite } from '@/app/actions'
import SettingsForms from '@/components/SettingsForms'
import { admin } from '@/lib/api'

export default async function SettingsPage() {
  const [account, site] = await Promise.all([
    admin<{ email: string }>('/account'),
    readSite(),
  ])
  return (
    <main className="pt-10">
      <h1 className="text-3xl font-semibold tracking-tight">Ajustes</h1>
      {account.ok && site ? (
        <SettingsForms site={site} email={account.data.email} siteUrl={process.env.SITE_URL?.replace(/\/$/, '') ?? null} />
      ) : (
        <p role="alert" className="border-danger/40 text-danger mt-8 rounded-2xl border p-5">
          {account.ok ? 'No se pudieron cargar los ajustes del sitio. Recarga la página.' : account.error}
        </p>
      )}
    </main>
  )
}
