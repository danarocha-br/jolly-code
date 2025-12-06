import { updateSession } from '@/utils/supabase/middleware'
import { wrapMiddlewareWithSentry } from '@sentry/nextjs'
import { type NextRequest } from 'next/server'

export const proxy = wrapMiddlewareWithSentry(async function proxy(
  request: NextRequest,
) {
  return await updateSession(request)
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
