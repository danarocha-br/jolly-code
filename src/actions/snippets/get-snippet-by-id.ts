'use server'

import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { getSnippetById as getSnippetByIdFromDb } from '@/lib/services/database/snippets'
import type { Snippet } from '@/features/snippets/dtos'

/**
 * Server Action: Get a single snippet by ID
 * 
 * @param snippetId - The ID of the snippet to retrieve
 * @returns ActionResult with snippet data or error message
 */
export async function getSnippetById(
    snippetId: string
): Promise<ActionResult<Snippet>> {
    try {
        if (!snippetId) {
            return error('Snippet ID is required')
        }

        const { user, supabase } = await requireAuth()

        const data = await getSnippetByIdFromDb({
            user_id: user.id,
            snippet_id: snippetId,
            supabase
        })

        if (!data || data.length === 0) {
            return error('Snippet not found')
        }

        return success(data[0])
    } catch (err) {
        console.error('Error fetching snippet:', err)

        if (err instanceof Error && err.message.includes('authenticated')) {
            return error('User must be authenticated')
        }

        return error('Failed to fetch snippet. Please try again later.')
    }
}
