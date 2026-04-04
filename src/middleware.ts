export { auth as middleware } from '@/lib/auth'

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|manifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
