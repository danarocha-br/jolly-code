'use server'

import { revalidatePath } from 'next/cache'

import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { insertAnimation } from '@/lib/services/database/animations'
import type { Animation } from '@/features/animations/dtos'
import type { AnimationSettings, AnimationSlide } from '@/types/animation'
import {
    checkAnimationLimit,
    checkSlideLimit,
    incrementUsageCount,
    type UsageLimitCheck,
} from '@/lib/services/usage-limits'

export type CreateAnimationInput = {
    id: string
    title: string
    slides: AnimationSlide[]
    settings: AnimationSettings
    url?: string | null
}

export type CreateAnimationResult = {
    animation: Animation
    usage: UsageLimitCheck
}

export async function createAnimation(
    input: CreateAnimationInput
): Promise<ActionResult<CreateAnimationResult>> {
    try {
        const { id, title, slides, settings, url } = input

        if (!id || !Array.isArray(slides) || slides.length === 0) {
            return error('Missing required fields: id and slides are required')
        }

        if (slides.length < 2) {
            return error('Add at least two slides to save an animation')
        }

        const { user, supabase } = await requireAuth()

        const limit = await checkAnimationLimit(supabase, user.id)
        if (!limit.canSave) {
            const maxText = limit.max ?? 'unlimited'
            return error(`You've reached the free plan limit (${limit.current}/${maxText} animations). Upgrade to Pro for unlimited animations!`)
        }

        const slideLimit = checkSlideLimit(slides.length, limit.plan)
        if (!slideLimit.canSave) {
            return error(`Free users can add up to ${slideLimit.max} slides per animation. Upgrade to Pro for unlimited slides!`)
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

        const usageResult = await incrementUsageCount(supabase, user.id, 'animations')

        revalidatePath('/animate')
        revalidatePath('/animations')

        return success({ animation: data[0] as Animation, usage: usageResult })
    } catch (err) {
        console.error('Error creating animation:', err)

        if (err instanceof Error && err.message.includes('authenticated')) {
            return error('User must be authenticated')
        }

        return error('Failed to create animation. Please try again later.')
    }
}
