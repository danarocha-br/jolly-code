'use server'

import { revalidatePath } from 'next/cache'

import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { deleteAnimationCollection as deleteAnimationCollectionDb } from '@/lib/services/database/animations'

export async function deleteAnimationCollection(
    collection_id: string
): Promise<ActionResult<null>> {
    try {
        if (!collection_id) {
            return error('Collection id is required')
        }

        const { user, supabase } = await requireAuth()

        await deleteAnimationCollectionDb({
            collection_id,
            user_id: user.id,
            supabase
        })

        const { error: decrementError } = await supabase.rpc('decrement_folder_count', {
            p_user_id: user.id
        })

        if (decrementError) {
            console.error('Error decrementing folder count:', decrementError)
        }

        revalidatePath('/animations')
        revalidatePath('/animate')

        return success(null)
    } catch (err) {
        console.error('Error deleting animation collection:', err)

        if (err instanceof Error && err.message.includes('authenticated')) {
            return error('User must be authenticated')
        }

        return error('Failed to delete collection. Please try again later.')
    }
}
