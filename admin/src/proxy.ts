import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Sin cookie de sesión, todo el panel redirige al login.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has('session')
  const isLogin = request.nextUrl.pathname === '/login'
  if (!hasSession && !isLogin) return NextResponse.redirect(new URL('/login', request.url))
  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next/|favicon.ico).*)'] }
