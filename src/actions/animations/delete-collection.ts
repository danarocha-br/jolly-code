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

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/17c92283-0a96-4e7e-a254-0870622a7b75', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: 'debug-session',
                runId: 'run-animations',
                hypothesisId: 'AH1',
                location: 'actions/animations/delete-collection.ts:23',
                message: 'deleteAnimationCollection action invoked',
                data: { collectionId: collection_id, userId: user.id },
                timestamp: Date.now(),
            }),
        }).catch(() => { })
        // #endregion

        await deleteAnimationCollectionDb({
            collection_id,
            user_id: user.id,
            supabase
        })

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
