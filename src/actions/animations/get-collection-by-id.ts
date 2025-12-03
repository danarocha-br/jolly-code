'use server'

import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { getAnimationCollectionById as getAnimationCollectionByIdDb } from '@/lib/services/database/animations'
import type { AnimationCollection } from '@/features/animations/dtos'

export async function getAnimationCollectionById(
    id: string
): Promise<ActionResult<AnimationCollection>> {
    try {
        if (!id) {
            return error('Collection id is required')
        }

        const { user, supabase } = await requireAuth()

        const data = await getAnimationCollectionByIdDb({
            id,
            user_id: user.id,
            supabase
        })

        if (!data) {
            return error('Collection not found')
        }

        return success(data as AnimationCollection)
    } catch (err) {
        console.error('Error fetching animation collection:', err)

        if (err instanceof Error && err.message.includes('authenticated')) {
            return error('User must be authenticated')
        }

        return error('Failed to fetch collection. Please try again later.')
    }
}
