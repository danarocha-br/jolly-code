'use server'

import { revalidatePath } from 'next/cache'

import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { deleteAnimation as deleteAnimationDb } from '@/lib/services/database/animations'
import { decrementUsageCount } from '@/lib/services/usage-limits'

export async function deleteAnimation(
    animation_id: string
): Promise<ActionResult<null>> {
    try {
        if (!animation_id) {
            return error('Animation id is required')
        }

        const { user, supabase } = await requireAuth()

        const { deletedCount } = await deleteAnimationDb({
            animation_id,
            user_id: user.id,
            supabase
        })

        if (deletedCount > 0) {
            await decrementUsageCount(supabase, user.id, 'animations').catch((decrementError) => {
                console.error('Failed to decrement animation usage', decrementError)
            })
        }

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
