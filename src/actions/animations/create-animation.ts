'use server'

import { revalidatePath } from 'next/cache'

import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { insertAnimation } from '@/lib/services/database/animations'
import type { Animation } from '@/features/animations/dtos'
import type { AnimationSettings, AnimationSlide } from '@/types/animation'
import { createAnimationInputSchema, formatZodError } from '@/actions/utils/validation'
import { withAuthAction } from '@/actions/utils/with-auth'
import type { UsageLimitCheck } from '@/lib/services/usage-limits'
import { getPlanConfig, getUpgradeTarget } from '@/lib/config/plans'

export type CreateAnimationInput = {
  id: string
  title?: string
  slides: AnimationSlide[]
  settings: AnimationSettings
  url?: string | null
}

export async function createAnimation(
  input: CreateAnimationInput
): Promise<ActionResult<Animation>> {
  try {
    const parsedInput = createAnimationInputSchema.safeParse(input)

    if (!parsedInput.success) {
      return error(formatZodError(parsedInput.error) ?? 'Invalid animation data')
    }

    const payload = parsedInput.data

    return withAuthAction(payload, async ({ id, title, slides, settings, url }, { user, supabase }) => {
      const { data: limitCheckRaw, error: animationLimitError } = await supabase.rpc('check_animation_limit', {
        p_user_id: user.id
      })

      if (animationLimitError) {
        console.error('Error checking animation limit:', animationLimitError)
        return error('Failed to verify save limit. Please try again.')
      }

      // Guard against null RPC response
      if (!limitCheckRaw || typeof limitCheckRaw !== 'object') {
        console.error('Invalid RPC response from check_animation_limit:', limitCheckRaw)
        return error('Failed to verify save limit. Please try again.')
      }

      // Map RPC response (can be camelCase or snake_case) to camelCase UsageLimitCheck type
      const rpcResponse = limitCheckRaw as {
        can_save?: boolean
        canSave?: boolean
        current?: number | null
        max?: number | null
        plan?: string | null
        over_limit?: number | null
        overLimit?: number | null
      }

      const animationLimitCheck: UsageLimitCheck = {
        canSave: Boolean(rpcResponse.canSave ?? rpcResponse.can_save ?? false),
        current: rpcResponse.current ?? 0,
        max: rpcResponse.max ?? null,
        plan: (rpcResponse.plan as UsageLimitCheck['plan']) ?? 'free',
        overLimit: rpcResponse.overLimit ?? rpcResponse.over_limit ?? undefined,
      }

      if (!animationLimitCheck.canSave) {
        const plan = animationLimitCheck.plan
        const current = animationLimitCheck.current ?? 0
        const max = animationLimitCheck.max ?? 0
        const overLimit = animationLimitCheck.overLimit ?? Math.max(current - max, 0)

        if (plan === 'free') {
          return error(`You have ${current} animations but the Free plan allows ${max}. Delete items or upgrade to save again. Over limit: ${overLimit}.`)
        } else if (plan === 'starter') {
          return error(`You\'ve reached your Starter limit (${current}/${max}). Upgrade to Pro for unlimited animations!`)
        }
        return error('Animation limit reached. Please upgrade your plan.')
      }

      // Check slide limit using plan config (slide limits are per-animation, not a database count)
      const plan = animationLimitCheck.plan
      const planConfig = getPlanConfig(plan)
      const maxSlides = planConfig.maxSlidesPerAnimation === Infinity ? null : planConfig.maxSlidesPerAnimation
      const canAdd = maxSlides === null || slides.length <= maxSlides

      if (!canAdd) {
        // Format maxSlides for display (null becomes "unlimited")
        const maxSlidesDisplay = maxSlides === null ? 'unlimited' : maxSlides.toString()
        
        // Get upgrade target and its maxSlides for upgrade messaging
        const upgradeTarget = getUpgradeTarget(plan)
        let upgradeMessage = ''
        
        if (upgradeTarget) {
          const upgradeConfig = getPlanConfig(upgradeTarget)
          const upgradeMaxSlides = upgradeConfig.maxSlidesPerAnimation === Infinity ? null : upgradeConfig.maxSlidesPerAnimation
          const upgradeMaxSlidesDisplay = upgradeMaxSlides === null || upgradeMaxSlides === Infinity ? 'unlimited' : upgradeMaxSlides.toString()
          const upgradePlanName = upgradeConfig.name
          upgradeMessage = ` Upgrade to ${upgradePlanName} for ${upgradeMaxSlidesDisplay} slides per animation!`
        }
        
        return error(`${planConfig.name} users can add up to ${maxSlidesDisplay} slides.${upgradeMessage}`)
      }

      const data = await insertAnimation({
        id,
        user_id: user.id,
        title: title || 'Untitled',
        slides,
        settings,
        url: url || null,
        supabase
      })

      if (!data || data.length === 0) {
        return error('Failed to create animation')
      }

      revalidatePath('/animate')
      revalidatePath('/animations')

      return success(data[0] as Animation)
    })
  } catch (err) {
    console.error('Error creating animation:', err)

    return error('Failed to create animation. Please try again later.')
  }
}
