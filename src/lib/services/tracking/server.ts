const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'

type CaptureOptions = {
  properties?: Record<string, any>
  distinctId?: string
  userId?: string
  requestMetadata?: {
    ip?: string
    userAgent?: string
  }
}

/**
 * Capture a server-side analytics event
 * @param eventName - The event name to track
 * @param options - Event options including properties, user ID, and request metadata
 */
export async function captureServerEvent(eventName: string, options: CaptureOptions = {}) {
  if (!POSTHOG_API_KEY) return

  const distinctId = options.distinctId ?? options.userId ?? options.properties?.distinct_id ?? 'server'
  
  const properties = {
    ...options.properties,
    distinct_id: distinctId,
    ...(options.requestMetadata?.ip && { $ip: options.requestMetadata.ip }),
    ...(options.requestMetadata?.userAgent && { $user_agent: options.requestMetadata.userAgent }),
  }

  const body = {
    api_key: POSTHOG_API_KEY,
    event: eventName,
    properties,
    distinct_id: distinctId,
  }

  try {
    const response = await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    
    // Log non-2xx responses in development only
    if (!response.ok && process.env.NODE_ENV === 'development') {
      console.warn(`PostHog event failed: ${response.status} ${response.statusText}`, {
        event: eventName,
        status: response.status,
      })
    }
  } catch (error) {
    // Only log errors in development to avoid cluttering production logs
    if (process.env.NODE_ENV === 'development') {
      console.error('Error sending PostHog event', error)
    }
    // Silently fail in production - analytics should never break the app
  }
}
