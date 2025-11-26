'use server'

import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { getUserCollectionById as getCollectionByIdFromDb } from '@/lib/services/database/collections'
import type { Collection } from '@/features/snippets/dtos'

/**
 * Server Action: Get a single collection by ID
 * 
 * @param collectionId - The ID of the collection to retrieve
 * @returns ActionResult with collection data or error message
 */
export async function getCollectionById(
    collectionId: string
): Promise<ActionResult<Collection>> {
    try {
        if (!collectionId) {
            return error('Collection ID is required')
        }

        const { user, supabase } = await requireAuth()

        const data = await getCollectionByIdFromDb({
            id: collectionId,
            user_id: user.id,
            supabase
        })

        if (!data) {
            return error('Collection not found')
        }

        return success(data as Collection)
    } catch (err) {
        console.error('Error fetching collection:', err)

        if (err instanceof Error && err.message.includes('authenticated')) {
            return error('User must be authenticated')
        }

        return error('Failed to fetch collection. Please try again later.')
    }
}
