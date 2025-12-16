import 'server-only'

import { FEATURE_FLAG_KEYS } from './feature-flag-keys'

import { PostHog } from 'posthog-node'

const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'

const FLAG_CACHE_TTL_MS = 5_000

type FeatureFlagCacheEntry = {
  expiresAt: number
  result: Promise<FeatureFlagResult>
}

const featureFlagCache = new Map<string, FeatureFlagCacheEntry>()

export type FeatureFlagEvaluationOptions = {
  distinctId?: string | null
  groups?: Record<string, string>
  personProperties?: Record<string, unknown>
}

export type FeatureFlagResult = {
  isEnabled: boolean
  payload?: unknown
  fromCache: boolean
  reason?: 'ok' | 'missing_api_key' | 'decide_error'
}

// Initialize PostHog client
let posthogClient: PostHog | null = null

function getPostHogClient() {
  if (!posthogClient && POSTHOG_API_KEY) {
    posthogClient = new PostHog(POSTHOG_API_KEY, { host: POSTHOG_HOST })
  } else if (!POSTHOG_API_KEY) {
    console.warn('[Feature Flags] PostHog API Key not found. Feature flags will default to false.')
  }
  return posthogClient
}

async function requestFeatureFlag(
  flagKey: string,
  options: FeatureFlagEvaluationOptions,
): Promise<FeatureFlagResult> {
  const client = getPostHogClient()

  if (!client) {
    return {
      isEnabled: false,
      fromCache: false,
      reason: 'missing_api_key',
    }
  }

  const distinctId = options.distinctId || 'anonymous'

  try {
    const isEnabled = await client.isFeatureEnabled(flagKey, distinctId, {
      groups: options.groups,
      personProperties: options.personProperties as Record<string, string> | undefined,
    })

    const payload = await client.getFeatureFlagPayload(flagKey, distinctId, undefined, {
      groups: options.groups,
      personProperties: options.personProperties as Record<string, string> | undefined,
    })

    // It's important to shutdown the client to flush events if this was a one-off script,
    // but in a server environment like Next.js we keep the singleton alive.
    // However, for stateless serverless functions, we might need a different approach.
    // Since this is Next.js App Router, a singleton variable at module scope should persist across requests in the same lambda container.



    return {
      isEnabled: Boolean(isEnabled),
      payload,
      fromCache: false,
      reason: 'ok',
    }
  } catch (error) {
    console.error(`[Feature Flags] Error evaluating flag '${flagKey}':`, error)
    return {
      isEnabled: false,
      fromCache: false,
      reason: 'decide_error',
    }
  }
}

function getCacheKey(flagKey: string, options: FeatureFlagEvaluationOptions) {
  return JSON.stringify({
    flagKey,
    distinctId: options.distinctId || 'anonymous',
    groups: options.groups || null,
    personProperties: options.personProperties || null,
  })
}

export async function getServerFeatureFlag(
  flagKey: string,
  options: FeatureFlagEvaluationOptions = {},
): Promise<FeatureFlagResult> {
  const cacheKey = getCacheKey(flagKey, options)
  const now = Date.now()
  const cachedEntry = featureFlagCache.get(cacheKey)

  if (cachedEntry && cachedEntry.expiresAt > now) {
    const cachedResult = await cachedEntry.result
    return { ...cachedResult, fromCache: true }
  }

  // We might not need caching as much if posthog-node handles it or if it's fast enough,
  // but keeping it for now to avoid excessive API calls if the SDK doesn't do local eval by default in this setup.
  // Note: posthog-node does local evaluation if initialized with personal_api_key,
  // but here we are using the project API key.
  // Actually, standard posthog-node init with just project key does remote evaluation unless personal key is provided for some features? 
  // Wait, the docs say for "Local Evaluation" you need to ensure the library is initialized correctly.
  // However, for consistency with the previous structure, I'll keep the cache wrapper but rely on the SDK for the actual call.

  const resultPromise = requestFeatureFlag(flagKey, options)
  featureFlagCache.set(cacheKey, {
    expiresAt: now + FLAG_CACHE_TTL_MS,
    result: resultPromise,
  })

  return resultPromise

}

export async function getAnimationFeatureFlag(options: FeatureFlagEvaluationOptions = {}) {
  return getServerFeatureFlag(FEATURE_FLAG_KEYS.betaCodeAnimate, options)
}
