'use server'

import { revalidatePath } from 'next/cache'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { updateSnippet as updateSnippetInDb } from '@/lib/services/database/snippets'
import type { Snippet } from '@/features/snippets/dtos'
import { formatZodError, updateSnippetInputSchema } from '@/actions/utils/validation'
import { withAuthAction } from '@/actions/utils/with-auth'

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
        const parsedInput = updateSnippetInputSchema.safeParse(input)

        if (!parsedInput.success) {
            return error(formatZodError(parsedInput.error) ?? 'Invalid snippet data')
        }

        const payload = parsedInput.data

        const data = await withAuthAction(payload, async ({ id, title, code, language, url }, { user, supabase }) =>
            updateSnippetInDb({
                id,
                user_id: user.id,
                title,
                code,
                language,
                url,
                supabase
            } as any)
        )

        if (!data || data.length === 0) {
            return error('Failed to update snippet')
        }

        // Revalidate relevant paths
        revalidatePath('/snippets')
        revalidatePath('/')

        return success(data[0])
    } catch (err) {
        console.error('Error updating snippet:', err)

        return error('Failed to update snippet. Please try again later.')
    }
}
