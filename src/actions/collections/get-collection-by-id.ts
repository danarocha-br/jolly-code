'use server'

import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { getUserCollectionById as getCollectionByIdFromDb } from '@/lib/services/database/collections'
import { getUsersSnippetsList } from '@/lib/services/database/snippets'
import type { Collection, Snippet } from '@/features/snippets/dtos'

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

        const [collectionData, snippetsData] = await Promise.all([
            getCollectionByIdFromDb({
                id: collectionId,
                user_id: user.id,
                supabase
            }),
            getUsersSnippetsList({
                user_id: user.id,
                supabase
            })
        ])

        if (!collectionData) {
            return error('Collection not found')
        }

        // Create a map of snippets for faster lookup
        const snippetsMap = new Map(snippetsData?.map(s => [s.id, s]) || [])

        // Populate collection with snippet objects
        const populatedCollection = {
            ...collectionData,
            snippets: ((collectionData.snippets as unknown as string[]) || [])
                .map((id: string) => snippetsMap.get(id))
                .filter((s: Snippet | undefined): s is Snippet => s !== undefined)
        }

        return success(populatedCollection as Collection)
    } catch (err) {
        console.error('Error fetching collection:', err)

        if (err instanceof Error && err.message.includes('authenticated')) {
            return error('User must be authenticated')
        }

        return error('Failed to fetch collection. Please try again later.')
    }
}
