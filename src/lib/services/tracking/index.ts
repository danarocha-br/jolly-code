'use client'

import posthog from 'posthog-js'
import type { User } from '@supabase/supabase-js'

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
    /**
     * Track an event with automatic user context
     * @param eventName - The event name to track
     * @param user - The user object (optional)
     * @param properties - Additional event properties
     */
    trackWithUser: (eventName: string, user: User | null | undefined, properties?: Record<string, any>) => {
        if (!ensurePostHogClient()) return

        const eventProperties = {
            ...properties,
            user_id: user?.id,
            is_guest_user: !user,
        }

        posthog.capture(eventName, eventProperties)
    },
    /**
     * Track an error event with standardized error properties
     * @param eventName - The event name to track
     * @param error - The error object
     * @param properties - Additional context properties
     */
    trackError: (eventName: string, error: Error | unknown, properties?: Record<string, any>) => {
        if (!ensurePostHogClient()) return

        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorStack = error instanceof Error ? error.stack : undefined
        const errorName = error instanceof Error ? error.name : 'UnknownError'

        posthog.capture(eventName, {
            ...properties,
            error_message: errorMessage,
            error_name: errorName,
            error_stack: errorStack,
        })
    },
    /**
     * Track a timing/performance metric
     * @param eventName - The event name to track
     * @param durationMs - Duration in milliseconds
     * @param properties - Additional properties
     */
    trackTiming: (eventName: string, durationMs: number, properties?: Record<string, any>) => {
        if (!ensurePostHogClient()) return

        posthog.capture(eventName, {
            ...properties,
            duration_ms: durationMs,
        })
    },
}

export { FEATURE_FLAG_KEYS }
