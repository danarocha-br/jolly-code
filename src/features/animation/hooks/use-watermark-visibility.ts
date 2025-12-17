import { useMemo } from 'react';
import { useWatermarkPreference } from '@/features/user/queries';

export type WatermarkVisibilityResult = {
  shouldShowWatermark: boolean;
  isLoading: boolean;
  canHideWatermark: boolean;
};

/**
 * Hook to determine if watermark should be shown
 * Watermark is hidden only if:
 * 1. User has PRO plan
 * 2. User has enabled "hide watermark" preference
 * 
 * @param userId - Optional user ID. If not provided, will use authenticated user
 * @returns Object with watermark visibility state
 */
export function useWatermarkVisibility(userId?: string): WatermarkVisibilityResult {
  const { data: preference, isLoading } = useWatermarkPreference(userId);

  const result = useMemo(() => {
    // If loading or no preference data, show watermark by default (safe default)
    if (isLoading || !preference) {
      return {
        shouldShowWatermark: true,
        isLoading,
        canHideWatermark: false,
      };
    }

    // Check if user can hide watermark (PRO plan)
    const canHideWatermark = preference.canHideWatermark;

    // Only hide watermark if user is PRO AND has enabled the preference
    const shouldShowWatermark = !(canHideWatermark && preference.hideWatermark);

    return {
      shouldShowWatermark,
      isLoading: false,
      canHideWatermark,
    };
  }, [preference, isLoading]);

  return result;
}

