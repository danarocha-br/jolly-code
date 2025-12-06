import 'server-only'

import { FEATURE_FLAG_KEYS } from './feature-flag-keys'

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

async function requestFeatureFlag(flagKey: string, options: FeatureFlagEvaluationOptions): Promise<FeatureFlagResult> {
  if (!POSTHOG_API_KEY) {
    return {
      isEnabled: false,
      fromCache: false,
      reason: 'missing_api_key',
    }
  }

  const body = {
    api_key: POSTHOG_API_KEY,
    distinct_id: options.distinctId || 'anonymous',
    groups: options.groups,
    person_properties: options.personProperties,
    only_evaluate_flags: [flagKey],
    send_feature_flag_payloads: true,
  }

  try {
    const response = await fetch(`${POSTHOG_HOST}/decide/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    if (!response.ok) {
      return {
        isEnabled: false,
        fromCache: false,
        reason: 'decide_error',
      }
    }

    const data = await response.json()
    const flagValue = data?.featureFlags?.[flagKey]
    const payload = data?.featureFlagPayloads?.[flagKey]

    return {
      isEnabled: Boolean(flagValue),
      payload,
      fromCache: false,
      reason: 'ok',
    }
  } catch (error) {
    console.error('Error evaluating PostHog feature flag', error)
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
