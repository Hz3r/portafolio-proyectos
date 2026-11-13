import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="py-24 text-center">
      <p className="font-pixel text-accent text-3xl">Game over</p>
      <p className="text-dim mt-4">Este proyecto no existe o fue borrado.</p>
      <Link href="/projects" className="btn mt-8">
        Volver a los proyectos
      </Link>
    </main>
  )
}
