'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { deleteSnippet as deleteSnippetFromDb } from '@/lib/services/database/snippets'
import { decrementUsageCount } from '@/lib/services/usage-limits'

/**
 * Server Action: Delete a snippet
 * 
 * @param snippetId - The ID of the snippet to delete
 * @returns ActionResult with success status or error message
 */
export async function deleteSnippet(
    snippetId: string
): Promise<ActionResult<{ success: true }>> {
    try {
        if (!snippetId) {
            return error('Snippet ID is required')
        }

        const { user, supabase } = await requireAuth()

        await deleteSnippetFromDb({
            snippet_id: snippetId,
            user_id: user.id,
            supabase
        })

        await decrementUsageCount(supabase, user.id, 'snippets').catch((decrementError) => {
            console.error('Failed to decrement snippet usage', decrementError)
        })

        // Revalidate relevant paths
        revalidatePath('/snippets')
        revalidatePath('/')

        return success({ success: true })
    } catch (err) {
        console.error('Error deleting snippet:', err)

        if (err instanceof Error && err.message.includes('authenticated')) {
            return error('User must be authenticated')
        }

        return error('Failed to delete snippet. Please try again later.')
    }
}
