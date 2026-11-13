import '@fontsource-variable/geist'
import '@fontsource/silkscreen/400.css'
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Panel | Portafolio',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
