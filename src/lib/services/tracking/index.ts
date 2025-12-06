'use client'

import posthog from 'posthog-js'

import { ensurePostHogClient } from '../../posthog'
import { FEATURE_FLAG_KEYS } from './feature-flag-keys'

export const analytics = {
    identify: (userId: string, traits?: Record<string, any>) => {
        if (!ensurePostHogClient()) return

        posthog.identify(userId, traits)
    },
    reset: () => {
        if (!ensurePostHogClient()) return

        posthog.reset()
    },
    track: (eventName: string, properties?: Record<string, any>) => {
        if (!ensurePostHogClient()) return

        posthog.capture(eventName, properties)
    },
}

export { FEATURE_FLAG_KEYS }
