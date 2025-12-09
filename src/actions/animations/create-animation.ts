'use server'

import { revalidatePath } from 'next/cache'

import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { insertAnimation } from '@/lib/services/database/animations'
import type { Animation } from '@/features/animations/dtos'
import type { AnimationSettings, AnimationSlide } from '@/types/animation'
import { createAnimationInputSchema, formatZodError } from '@/actions/utils/validation'
import { withAuthAction } from '@/actions/utils/with-auth'

export interface AnimationLimitResponse {
  canSave: boolean
  plan: string
  current?: number
  max?: number
  over_limit?: number
}

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

    if (payload.slides.length < 2) {
      return error('Add at least two slides to save an animation')
    }

    return withAuthAction(payload, async ({ id, title, slides, settings, url }, { user, supabase }) => {
      const { data: animationLimitCheck, error: animationLimitError } = await supabase.rpc('check_animation_limit', {
        p_user_id: user.id
      }) as { data: AnimationLimitResponse | null; error: any }

      if (animationLimitError) {
        console.error('Error checking animation limit:', animationLimitError)
        return error('Failed to verify save limit. Please try again.')
      }

      if (!animationLimitCheck) {
        return error('Failed to verify save limit. Please try again.')
      }

      if (!animationLimitCheck.canSave) {
        const plan = animationLimitCheck.plan
        const current = animationLimitCheck.current ?? 0
        const max = animationLimitCheck.max ?? 0
        const overLimit = animationLimitCheck.over_limit ?? Math.max(current - max, 0)

        if (plan === 'free') {
          return error(`You have ${current} animations but the Free plan allows ${max}. Delete items or upgrade to save again. Over limit: ${overLimit}.`)
        } else if (plan === 'started') {
          return error(`You\'ve reached your Started limit (${current}/${max}). Upgrade to Pro for unlimited animations!`)
        }
        return error('Animation limit reached. Please upgrade your plan.')
      }

      const { data: slideLimitCheck, error: slideLimitError } = await supabase.rpc('check_slide_limit', {
        p_user_id: user.id,
        p_slide_count: slides.length
      })

      if (slideLimitError) {
        console.error('Error checking slide limit:', slideLimitError)
        return error('Failed to verify slide limit. Please try again.')
      }

      if (!slideLimitCheck.canAdd) {
        const plan = slideLimitCheck.plan
        if (plan === 'free') {
          return error('Free users can add up to 3 slides. Upgrade to Started for 10 slides per animation!')
        } else if (plan === 'started') {
          return error('Started users can add up to 10 slides. Upgrade to Pro for unlimited slides!')
        }
        return error('Slide limit exceeded. Please upgrade your plan.')
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
