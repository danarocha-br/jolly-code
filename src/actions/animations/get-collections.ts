'use server'

import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { getAnimationCollections as getAnimationCollectionsDb } from '@/lib/services/database/animations'
import type { AnimationCollection } from '@/features/animations/dtos'

export async function getAnimationCollections(): Promise<ActionResult<AnimationCollection[]>> {
    try {
        const { user, supabase } = await requireAuth()

        const data = await getAnimationCollectionsDb({
            user_id: user.id,
            supabase
        })

        if (!data) {
            return error('No collections found')
        }

        return success(data as AnimationCollection[])
    } catch (err) {
        console.error('Error fetching animation collections:', err)

        if (err instanceof Error && err.message.includes('authenticated')) {
            return error('User must be authenticated')
        }

        return error('Failed to fetch collections. Please try again later.')
    }
}
