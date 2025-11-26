'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { ReactNode } from 'react'

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
  })
}

import { useEffect } from 'react'

export function CSPostHogProvider({ children, user }: { children: ReactNode, user?: any }) {
  useEffect(() => {
    if (user) {
      posthog.identify(user.id, {
        email: user.email,
        name: user.user_metadata?.full_name,
      })
    } else {
      posthog.reset()
    }
  }, [user])

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
