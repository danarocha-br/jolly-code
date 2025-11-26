const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'

type CaptureOptions = {
  properties?: Record<string, any>
  distinctId?: string
}

export async function captureServerEvent(eventName: string, options: CaptureOptions = {}) {
  if (!POSTHOG_API_KEY) return

  const body = {
    api_key: POSTHOG_API_KEY,
    event: eventName,
    properties: options.properties,
    distinct_id: options.distinctId ?? options.properties?.distinct_id ?? 'server',
  }

  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
  } catch (error) {
    console.error('Error sending PostHog event', error)
  }
}
