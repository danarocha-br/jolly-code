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

        const collectionsData = await getUsersCollectionList({
            user_id: user.id,
            supabase
        })

        if (!collectionsData) {
            return success([])
        }

        // Collections already have snippets populated from the service layer
        // Map to DTO format, ensuring id is always present and filtering out any null values
        const populatedCollections: Collection[] = collectionsData
            .filter((collection): collection is typeof collection & { id: string } => !!collection.id)
            .map((collection) => ({
                id: collection.id,
                user_id: collection.user_id,
                title: collection.title,
                snippets: (collection.snippets || [])
                    .filter((s: any): s is Snippet => s !== null && s.id !== undefined)
                    .map((s: any) => ({
                        id: s.id,
                        user_id: s.user_id,
                        code: s.code,
                        language: s.language,
                        title: s.title,
                        url: s.url,
                        created_at: s.created_at,
                    })),
                created_at: collection.created_at,
                updated_at: collection.updated_at,
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
