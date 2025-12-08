'use server'

import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { getUserUsage } from '@/lib/services/usage-limits'
import { calculateDowngradeImpact, getDowngradeTarget, type DowngradeImpact } from '@/lib/utils/downgrade-impact'
import type { PlanId } from '@/lib/config/plans'

/**
 * Server Action: Check downgrade impact for a target plan
 */
export async function checkDowngradeImpact(
  targetPlan?: PlanId
): Promise<ActionResult<DowngradeImpact>> {
  try {
    const { user, supabase } = await requireAuth()

    const usage = await getUserUsage(supabase, user.id)
    const currentPlan = usage.plan

    // If no target plan specified, use the next lower tier
    const finalTargetPlan = targetPlan || getDowngradeTarget(currentPlan)

    if (!finalTargetPlan) {
      return error('No downgrade target available. You are already on the free plan.')
    }

    if (finalTargetPlan === currentPlan) {
      return error('Target plan is the same as current plan.')
    }

    // Check if trying to upgrade instead of downgrade
    const planOrder: PlanId[] = ['free', 'started', 'pro']
    const currentIndex = planOrder.indexOf(currentPlan)
    const targetIndex = planOrder.indexOf(finalTargetPlan)

    if (targetIndex > currentIndex) {
      return error('This is an upgrade, not a downgrade. Use the upgrade flow instead.')
    }

    const impact = calculateDowngradeImpact(usage, finalTargetPlan)

    return success(impact)
  } catch (err) {
    console.error('Error checking downgrade impact:', err)

    if (err instanceof Error && err.message.includes('authenticated')) {
      return error('User must be authenticated')
    }

    return error('Failed to check downgrade impact. Please try again later.')
  }
}

