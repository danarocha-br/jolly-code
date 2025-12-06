"use client";

import { useMemo } from "react";
import { useFeatureFlagEnabled } from 'posthog-js/react'
import posthog from 'posthog-js'

import { ensurePostHogClient } from '@/lib/posthog'
import { FEATURE_FLAG_KEYS } from '@/lib/services/tracking/feature-flag-keys'

type UseAnimationFeatureFlagOptions = {
  initialValue?: boolean
}

export function useAnimationFeatureFlag(options?: UseAnimationFeatureFlagOptions) {
  const isProduction = process.env.NODE_ENV === 'production'
  const allowLocalFlags = process.env.NEXT_PUBLIC_POSTHOG_ENABLE_LOCAL === 'true'
  const isLocalBypass = !isProduction && !allowLocalFlags

  const isClientReady = ensurePostHogClient()

  const hasInitialValue = typeof options?.initialValue === 'boolean'
  const fallbackValue = options?.initialValue ?? false

  const isFlagEnabled = useFeatureFlagEnabled(FEATURE_FLAG_KEYS.betaCodeAnimate)

  const isLoading = useMemo(() => {
    if (isLocalBypass) return false
    if (!isClientReady) return false
    if (hasInitialValue) return false
    return posthog.getFeatureFlag(FEATURE_FLAG_KEYS.betaCodeAnimate) === undefined
  }, [hasInitialValue, isClientReady, isLocalBypass])

  return {
    isEnabled: isLocalBypass ? true : isClientReady ? Boolean(isFlagEnabled) : fallbackValue,
    isLoading,
  }
}
