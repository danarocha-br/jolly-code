'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { updateSnippet as updateSnippetInDb } from '@/lib/services/database'
import type { Snippet } from '@/feature-snippets/dtos'

export type UpdateSnippetInput = {
    id: string
    title?: string
    code?: string
    language?: string
    url?: string
}

/**
 * Server Action: Update an existing snippet
 * 
 * @param input - The snippet data to update
 * @returns ActionResult with updated snippet or error message
 */
export async function updateSnippet(
    input: UpdateSnippetInput
): Promise<ActionResult<Snippet>> {
    try {
        const { id, title, code, language, url } = input

        if (!id) {
            return error('Snippet ID is required')
        }

        const { user, supabase } = await requireAuth()

        const data = await updateSnippetInDb({
            id,
            user_id: user.id,
            title,
            code,
            language,
            url,
            supabase
        } as any)

        if (!data || data.length === 0) {
            return error('Failed to update snippet')
        }

        // Revalidate relevant paths
        revalidatePath('/snippets')
        revalidatePath('/')

        return success(data[0])
    } catch (err) {
        console.error('Error updating snippet:', err)

        if (err instanceof Error && err.message.includes('authenticated')) {
            return error('User must be authenticated')
        }

        return error('Failed to update snippet. Please try again later.')
    }
}
