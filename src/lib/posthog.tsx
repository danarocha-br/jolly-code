'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { ReactNode, useEffect, useState } from 'react'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'
const IS_BROWSER = typeof window !== 'undefined'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const ENABLE_POSTHOG_LOCAL = process.env.NEXT_PUBLIC_POSTHOG_ENABLE_LOCAL === 'true'
const IS_LOCALHOST = IS_BROWSER && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
const IS_POSTHOG_CONFIGURED = Boolean(POSTHOG_KEY) && (IS_PRODUCTION || ENABLE_POSTHOG_LOCAL)

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

  useEffect(() => {
    ensurePostHogClient()
  }, [])

  useEffect(() => {
    if (!ensurePostHogClient()) return
    if (!user) {
      posthog.reset()
      return
    }

    const email = user?.email?.toLowerCase()
    const userId = user.id || email || undefined
    
    if (!userId) {
      // Cannot identify without user ID or email
      return
    }

    // Fetch user profile to get plan and signup date (only if we have a numeric ID)
    let cancelled = false
    const fetchUserProperties = async () => {
      try {
        // Only fetch profile if we have a numeric user ID (not just email)
        if (!user.id) {
          // Skip profile fetch when userId is derived from email
          posthog.identify(userId, {
            email: email || undefined,
            name: user.user_metadata?.full_name || undefined,
          })
          if (posthog.setPersonPropertiesForFlags) {
            posthog.setPersonPropertiesForFlags({
              email: email || undefined,
              name: user.user_metadata?.full_name || undefined,
            })
          }
          return
        }

        const { createClient } = await import('@/utils/supabase/client')
        const supabase = createClient()
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan, created_at')
          .eq('id', user.id)
          .single()

        if (cancelled) return

        const userProperties: Record<string, any> = {
          email: email || undefined,
          name: user.user_metadata?.full_name || undefined,
        }

        if (profile) {
          userProperties.plan = profile.plan
          if (profile.created_at) {
            userProperties.signup_date = profile.created_at
          }
        }

        posthog.identify(userId, userProperties)
        if (posthog.setPersonPropertiesForFlags) {
          posthog.setPersonPropertiesForFlags(userProperties)
        }
      } catch (error) {
        if (cancelled) return
        // Fallback to basic identification if profile fetch fails
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch user profile for analytics:', error)
        }
        posthog.identify(userId, {
          email: email || undefined,
          name: user.user_metadata?.full_name || undefined,
        })
        if (posthog.setPersonPropertiesForFlags) {
          posthog.setPersonPropertiesForFlags({
            email: email || undefined,
            name: user.user_metadata?.full_name || undefined,
          })
        }
      }
    }

    fetchUserProperties()

    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!ensurePostHogClient()) return
    if (!pathname) return

    posthog.capture('$pageview')
  }, [pathname, searchParams])

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
