import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanId } from '@/lib/config/plans';

export type WatermarkPreference = {
  hideWatermark: boolean;
  plan: PlanId;
  canHideWatermark: boolean; // true only if plan is 'pro'
};

/**
 * Get user's watermark visibility preference
 * @param supabase - Supabase client
 * @param userId - User ID to fetch preference for
 * @returns Watermark preference with plan info, or null if user not found
 */
export async function getWatermarkPreference(
  supabase: SupabaseClient,
  userId: string
): Promise<WatermarkPreference | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('hide_watermark, plan')
      .eq('id', userId)
      .single();

    if (error) {
      // Handle missing column error gracefully (migration not run yet)
      if (error.code === '42703' || error.message?.includes('does not exist')) {
        console.warn('[getWatermarkPreference] Column hide_watermark does not exist. Migration may not have been run. Returning default preference.');
        // Return default preference (watermark shown) if column doesn't exist
        const { data: profileData } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', userId)
          .single();
        
        const plan = (profileData?.plan as PlanId) || 'free';
        return {
          hideWatermark: false, // Default: show watermark
          plan,
          canHideWatermark: plan === 'pro',
        };
      }
      
      console.error('[getWatermarkPreference] Error fetching preference:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    const plan = (data.plan as PlanId) || 'free';
    const canHideWatermark = plan === 'pro';

    return {
      hideWatermark: data.hide_watermark ?? false,
      plan,
      canHideWatermark,
    };
  } catch (error) {
    console.error('[getWatermarkPreference] Unexpected error:', error);
    return null;
  }
}

/**
 * Update user's watermark visibility preference
 * Only PRO users can hide watermarks - this is validated on server
 * @param supabase - Supabase client
 * @param userId - User ID to update preference for
 * @param hideWatermark - Whether to hide watermark
 * @returns Success status and optional error message
 */
export async function updateWatermarkPreference(
  supabase: SupabaseClient,
  userId: string,
  hideWatermark: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // First, verify user has PRO plan
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('[updateWatermarkPreference] Error fetching profile:', fetchError);
      return {
        success: false,
        error: 'Failed to verify user plan',
      };
    }

    const plan = (profile?.plan as PlanId) || 'free';

    // Only PRO users can hide watermarks
    if (hideWatermark && plan !== 'pro') {
      return {
        success: false,
        error: 'Upgrade to PRO to remove watermarks',
      };
    }

    // Update preference
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ hide_watermark: hideWatermark })
      .eq('id', userId);

    if (updateError) {
      // Handle missing column error gracefully (migration not run yet)
      if (updateError.code === '42703' || updateError.message?.includes('does not exist')) {
        console.warn('[updateWatermarkPreference] Column hide_watermark does not exist. Migration may not have been run.');
        return {
          success: false,
          error: 'Database migration required. Please run: supabase migration up',
        };
      }
      
      console.error('[updateWatermarkPreference] Error updating preference:', updateError);
      return {
        success: false,
        error: 'Failed to update watermark preference',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[updateWatermarkPreference] Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

