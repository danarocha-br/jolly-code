'use server'

import { revalidatePath } from 'next/cache'

import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { updateAnimation as updateAnimationDb } from '@/lib/services/database/animations'
import type { Animation } from '@/features/animations/dtos'
import type { AnimationSettings, AnimationSlide } from '@/types/animation'

export type UpdateAnimationInput = {
    id: string
    title?: string
    slides?: AnimationSlide[]
    settings?: AnimationSettings
    url?: string | null
}

export async function updateAnimation(
    input: UpdateAnimationInput
): Promise<ActionResult<Animation>> {
    try {
        const { id, title, slides, settings, url } = input

        if (!id) {
            return error('Animation id is required')
        }

        const { user, supabase } = await requireAuth()

        const data = await updateAnimationDb({
            id,
            user_id: user.id,
            title: title || 'Untitled',
            slides: slides || [],
            settings: settings || ({} as AnimationSettings),
            url: url || null,
            supabase
        })

        if (!data || data.length === 0) {
            return error('Failed to update animation')
        }

        revalidatePath('/animate')
        revalidatePath('/animations')

        return success(data[0] as Animation)
    } catch (err) {
        console.error('Error updating animation:', err)

        if (err instanceof Error && err.message.includes('authenticated')) {
            return error('User must be authenticated')
        }

        return error('Failed to update animation. Please try again later.')
    }
}
