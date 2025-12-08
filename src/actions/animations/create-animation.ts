'use server'

import { revalidatePath } from 'next/cache'

import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { insertAnimation } from '@/lib/services/database/animations'
import type { Animation } from '@/features/animations/dtos'
import type { AnimationSettings, AnimationSlide } from '@/types/animation'

export type CreateAnimationInput = {
    id: string
    title: string
    slides: AnimationSlide[]
    settings: AnimationSettings
    url?: string | null
}

export async function createAnimation(
    input: CreateAnimationInput
): Promise<ActionResult<Animation>> {
    try {
        const { id, title, slides, settings, url } = input

        if (!id || !Array.isArray(slides) || slides.length === 0) {
            return error('Missing required fields: id and slides are required')
        }

        if (slides.length < 2) {
            return error('Add at least two slides to save an animation')
        }

        const { user, supabase } = await requireAuth()

        // Check animation save limit
        const { data: animationLimitCheck, error: animationLimitError } = await supabase.rpc('check_animation_limit', {
            p_user_id: user.id
        })

        if (animationLimitError) {
            console.error('Error checking animation limit:', animationLimitError)
            return error('Failed to verify save limit. Please try again.')
        }

        if (!animationLimitCheck.canSave) {
            const plan = animationLimitCheck.plan
            if (plan === 'free') {
                return error('Free plan doesn\'t allow saving animations. Upgrade to Started to save up to 50 animations!')
            } else if (plan === 'started') {
                return error('You\'ve reached your limit (50/50 animations). Upgrade to Pro for unlimited animations!')
            }
            return error('Animation limit reached. Please upgrade your plan.')
        }

        // Check slide count limit
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
    } catch (err) {
        console.error('Error creating animation:', err)

        if (err instanceof Error && err.message.includes('authenticated')) {
            return error('User must be authenticated')
        }

        return error('Failed to create animation. Please try again later.')
    }
}
