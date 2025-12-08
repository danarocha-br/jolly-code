'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { insertSnippet } from '@/lib/services/database/snippets'
import type { Snippet } from '@/features/snippets/dtos'
export type CreateSnippetInput = {
    id: string
    title?: string
    code: string
    language: string
    url?: string
}

/**
 * Server Action: Create a new snippet
 * 
 * @param input - The snippet data to create
 * @returns ActionResult with created snippet or error message
 */
export async function createSnippet(
    input: CreateSnippetInput
): Promise<ActionResult<Snippet>> {
    try {
        const { id, title, code, language, url } = input

        // Validation
        if (!id || !code || !language) {
            return error('Missing required fields: id, code, and language are required')
        }

        const { user, supabase } = await requireAuth()

        // Check snippet limit before allowing save
        const { data: limitCheck, error: limitError } = await supabase.rpc('check_snippet_limit', {
            p_user_id: user.id
        })

        if (limitError) {
            console.error('Error checking snippet limit:', limitError)
            return error('Failed to verify save limit. Please try again.')
        }

        if (!limitCheck.canSave) {
            const plan = limitCheck.plan
            if (plan === 'free') {
                return error('Free plan doesn\'t allow saving snippets. Upgrade to Started to save up to 50 snippets!')
            } else if (plan === 'started') {
                return error('You\'ve reached your limit (50/50 snippets). Upgrade to Pro for unlimited snippets!')
            }
            return error('Snippet limit reached. Please upgrade your plan.')
        }

        const data = await insertSnippet({
            id,
            user_id: user.id,
            title: title || 'Untitled',
            code,
            language,
            url: url || null,
            supabase
        })

        if (!data || data.length === 0) {
            return error('Failed to create snippet')
        }

        // Revalidate the snippets list
        revalidatePath('/snippets')
        revalidatePath('/')

        return success(data[0])
    } catch (err) {
        console.error('Error creating snippet:', err)

        if (err instanceof Error && err.message.includes('authenticated')) {
            return error('User must be authenticated')
        }

        return error('Failed to create snippet. Please try again later.')
    }
}
