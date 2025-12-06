'use server'

import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { getAnimationById as getAnimationByIdDb } from '@/lib/services/database/animations'
import type { Animation } from '@/features/animations/dtos'

export async function getAnimationById(
    id: string
): Promise<ActionResult<Animation>> {
    try {
        if (!id) {
            return error('Animation id is required')
        }

        const { user, supabase } = await requireAuth()

        const data = await getAnimationByIdDb({
            animation_id: id,
            user_id: user.id,
            supabase
        })

        if (!data || data.length === 0) {
            return error('Animation not found')
        }

        return success(data[0] as Animation)
    } catch (err) {
        console.error('Error fetching animation:', err)

        if (err instanceof Error && err.message.includes('authenticated')) {
            return error('User must be authenticated')
        }

        return error('Failed to fetch animation. Please try again later.')
    }
}
