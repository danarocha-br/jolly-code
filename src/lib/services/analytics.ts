import posthog from 'posthog-js'

export const analytics = {
    identify: (userId: string, traits?: Record<string, any>) => {
        posthog.identify(userId, traits)
    },
    reset: () => {
        posthog.reset()
    },
    track: (eventName: string, properties?: Record<string, any>) => {
        posthog.capture(eventName, properties)
    },
}
