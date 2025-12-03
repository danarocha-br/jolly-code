'use server'

import { revalidatePath } from 'next/cache'

import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { updateAnimationCollection as updateAnimationCollectionDb } from '@/lib/services/database/animations'
import type { AnimationCollection, Animation } from '@/features/animations/dtos'

export type UpdateAnimationCollectionInput = {
    id: string
    title?: string
    animations?: Animation[]
}

export async function updateAnimationCollection(
    input: UpdateAnimationCollectionInput
): Promise<ActionResult<AnimationCollection>> {
    try {
        const { id, title, animations } = input

        if (!id) {
            return error('Collection id is required')
        }

        const { user, supabase } = await requireAuth()

        const data = await updateAnimationCollectionDb({
            id,
            user_id: user.id,
            title: title || 'Untitled',
            animations: animations as any,
            supabase
        })

        if (!data || data.length === 0) {
            return error('Failed to update collection')
        }

        revalidatePath('/animations')
        revalidatePath('/animate')

        return success(data[0] as AnimationCollection)
    } catch (err) {
        console.error('Error updating animation collection:', err)

        if (err instanceof Error && err.message.includes('authenticated')) {
            return error('User must be authenticated')
        }

        return error('Failed to update collection. Please try again later.')
    }
}
