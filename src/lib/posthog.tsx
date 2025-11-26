'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { ReactNode, useEffect, useState } from 'react'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'
const IS_BROWSER = typeof window !== 'undefined'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const IS_LOCALHOST = IS_BROWSER && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
const IS_POSTHOG_CONFIGURED = Boolean(POSTHOG_KEY) && IS_PRODUCTION && !IS_LOCALHOST

let hasInitialized = false

export function ensurePostHogClient() {
  if (!IS_BROWSER || !IS_POSTHOG_CONFIGURED) return false
  if (hasInitialized) return true

  posthog.init(POSTHOG_KEY!, {
    api_host: POSTHOG_HOST,
    autocapture: true,
    capture_pageview: false,
    person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
  })
  hasInitialized = true
  return true
}

export function CSPostHogProvider({ children, user }: { children: ReactNode, user?: any }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    setIsReady(ensurePostHogClient())
  }, [])

  useEffect(() => {
    if (!isReady) return

    if (user) {
      posthog.identify(user.id, {
        email: user.email,
        name: user.user_metadata?.full_name,
      })
    } else {
      posthog.reset()
    }
  }, [user])

  useEffect(() => {
    if (!isReady) return
    if (!pathname) return

    posthog.capture('$pageview')
  }, [pathname, searchParams])

  if (!isReady) return children

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
