'use server'

import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { getUsersCollectionList } from '@/lib/services/database/collections'
import type { Collection, Snippet } from '@/features/snippets/dtos'

/**
 * Server Action: Get all collections for the authenticated user
 * 
 * @returns ActionResult with array of collections or error message
 */
export async function getCollections(): Promise<ActionResult<Collection[]>> {
    try {
        const { user, supabase } = await requireAuth()

        const collectionsData: Collection[] = await getUsersCollectionList({
            user_id: user.id,
            supabase
        })

        if (!collectionsData) {
            return success([])
        }

        // Collections already have snippets populated from the service layer
        // Just ensure snippets array exists and filter out any null values
        const populatedCollections = collectionsData.map((collection) => ({
            ...collection,
            snippets: (collection.snippets || []).filter((s: Snippet | null): s is Snippet => s !== null)
        }))

        return success(populatedCollections)
    } catch (err) {
        console.error('Error fetching collections:', err)

        if (err instanceof Error && err.message.includes('authenticated')) {
            return error('User must be authenticated')
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch collections. Please try again later.';
        return error(errorMessage)
    }
}
