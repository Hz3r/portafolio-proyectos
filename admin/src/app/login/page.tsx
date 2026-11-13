import LoginForm from '@/components/LoginForm'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expirada?: string }> }) {
  const { expirada } = await searchParams
  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <p className="pixel text-accent">Panel</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Inicia sesión</h1>
        {expirada && <p className="text-dim mt-3">Tu sesión caducó. Vuelve a entrar para continuar.</p>}
        <LoginForm />
      </div>
    </main>
  )
}
