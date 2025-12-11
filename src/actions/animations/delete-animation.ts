'use server'

import { revalidatePath } from 'next/cache'

import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { deleteAnimation as deleteAnimationDb } from '@/lib/services/database/animations'

export async function deleteAnimation(
    animation_id: string
): Promise<ActionResult<null>> {
    try {
        if (!animation_id) {
            return error('Animation id is required')
        }

        const { user, supabase } = await requireAuth()

        await deleteAnimationDb({
            animation_id,
            user_id: user.id,
            supabase
        })

        revalidatePath('/animate')
        revalidatePath('/animations')

        return success(null)
    } catch (err) {
        console.error('Error deleting animation:', err)

        if (err instanceof Error && err.message.includes('authenticated')) {
            return error('User must be authenticated')
        }

        return error('Failed to delete animation. Please try again later.')
    }
}
