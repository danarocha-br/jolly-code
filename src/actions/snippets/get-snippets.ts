'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { getUsersSnippetsList } from '@/lib/services/database'
import type { Snippet } from '@/feature-snippets/dtos'

/**
 * Server Action: Get all snippets for the authenticated user
 * 
 * @returns ActionResult with array of snippets or error message
 */
export async function getSnippets(): Promise<ActionResult<Snippet[]>> {
    try {
        const { user, supabase } = await requireAuth()

        const data = await getUsersSnippetsList({
            user_id: user.id,
            supabase
        })

        if (!data) {
            return error('No snippets found')
        }

        return success(data)
    } catch (err) {
        console.error('Error fetching snippets:', err)

        if (err instanceof Error && err.message.includes('authenticated')) {
            return error('User must be authenticated')
        }

        return error('Failed to fetch snippets. Please try again later.')
    }
}
