'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { deleteCollection as deleteCollectionFromDb } from '@/lib/services/database/collections'

/**
 * Server Action: Delete a collection
 * 
 * @param collectionId - The ID of the collection to delete
 * @returns ActionResult with success status or error message
 */
export async function deleteCollection(
    collectionId: string
): Promise<ActionResult<{ success: true }>> {
    try {
        if (!collectionId) {
            return error('Collection ID is required')
        }

        const { user, supabase } = await requireAuth()

        await deleteCollectionFromDb({
            collection_id: collectionId,
            user_id: user.id,
            supabase
        })

        const { error: decrementError } = await supabase.rpc('decrement_folder_count', {
            p_user_id: user.id
        })

        if (decrementError) {
            console.error('Error decrementing folder count:', decrementError)
        }

        // Revalidate relevant paths
        revalidatePath('/collections')
        revalidatePath('/')

        return success({ success: true })
    } catch (err) {
        console.error('Error deleting collection:', err)

        if (err instanceof Error && err.message.includes('authenticated')) {
            return error('User must be authenticated')
        }

        return error('Failed to delete collection. Please try again later.')
    }
}
