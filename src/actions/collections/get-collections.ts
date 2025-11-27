'use server'

import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { getUsersCollectionList } from '@/lib/services/database/collections'
import { getUsersSnippetsList } from '@/lib/services/database/snippets'
import type { Collection, Snippet } from '@/features/snippets/dtos'

/**
 * Server Action: Get all collections for the authenticated user
 * 
 * @returns ActionResult with array of collections or error message
 */
export async function getCollections(): Promise<ActionResult<Collection[]>> {
    try {
        const { user, supabase } = await requireAuth()

        const [collectionsData, snippetsData] = await Promise.all([
            getUsersCollectionList({
                user_id: user.id,
                supabase
            }),
            getUsersSnippetsList({
                user_id: user.id,
                supabase
            })
        ])

        if (!collectionsData) {
            return success([])
        }

        // Create a map of snippets for faster lookup
        const snippetsMap = new Map(snippetsData?.map(s => [s.id, s]) || [])

        // Populate collections with snippet objects
        const populatedCollections = collectionsData.map((collection: any) => ({
            ...collection,
            snippets: (collection.snippets || [])
                .map((id: string) => snippetsMap.get(id))
                .filter((s: Snippet | undefined): s is Snippet => s !== undefined)
        }))

        return success(populatedCollections as Collection[])
    } catch (err) {
        console.error('Error fetching collections:', err)

        if (err instanceof Error && err.message.includes('authenticated')) {
            return error('User must be authenticated')
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch collections. Please try again later.';
        return error(errorMessage)
    }
}
