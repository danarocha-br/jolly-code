'use server';

import { createClient } from '@/utils/supabase/server';
import { updateWatermarkPreference } from '@/lib/services/user-preferences';
import type { PlanId } from '@/lib/config/plans';

export type UpdateWatermarkPreferenceResult = {
  success: boolean;
  error?: string;
  requiresUpgrade?: boolean;
};

/**
 * Server action to update user's watermark visibility preference
 * Validates authentication and PRO plan requirement
 */
export async function updateWatermarkPreferenceAction(
  hideWatermark: boolean
): Promise<UpdateWatermarkPreferenceResult> {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be signed in to update preferences',
      };
    }

    // Verify user has PRO plan if trying to hide watermark
    if (hideWatermark) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('[updateWatermarkPreferenceAction] Error fetching profile:', profileError);
        return {
          success: false,
          error: 'Failed to verify your plan',
        };
      }

      const plan = (profile?.plan as PlanId) || 'free';

      if (plan !== 'pro') {
        return {
          success: false,
          error: 'Upgrade to PRO to remove watermarks',
          requiresUpgrade: true,
        };
      }
    }

    // Update preference
    const result = await updateWatermarkPreference(supabase, user.id, hideWatermark);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to update preference',
        requiresUpgrade: result.error?.includes('PRO'),
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[updateWatermarkPreferenceAction] Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

