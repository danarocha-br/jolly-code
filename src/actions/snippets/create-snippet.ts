'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { insertSnippet } from '@/lib/services/database/snippets'
import type { Snippet } from '@/features/snippets/dtos'
import {
    checkSnippetLimit,
    incrementUsageCount,
    type UsageLimitCheck,
} from '@/lib/services/usage-limits'

export type CreateSnippetInput = {
    id: string
    title?: string
    code: string
    language: string
    url?: string
}

export type CreateSnippetResult = {
    snippet: Snippet
    usage: UsageLimitCheck
}

/**
 * Server Action: Create a new snippet
 * 
 * @param input - The snippet data to create
 * @returns ActionResult with created snippet or error message
 */
export async function createSnippet(
    input: CreateSnippetInput
): Promise<ActionResult<CreateSnippetResult>> {
    try {
        const { id, title, code, language, url } = input

        // Validation
        if (!id || !code || !language) {
            return error('Missing required fields: id, code, and language are required')
        }

        const { user, supabase } = await requireAuth()

        const limit = await checkSnippetLimit(supabase, user.id)
        if (!limit.canSave) {
            const maxText = limit.max ?? 'unlimited'
            return error(`You've reached the free plan limit (${limit.current}/${maxText} snippets). Upgrade to Pro for unlimited snippets!`)
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

        const updatedUsage = await incrementUsageCount(supabase, user.id, 'snippets')

        // Revalidate the snippets list
        revalidatePath('/snippets')
        revalidatePath('/')

        return success({ snippet: data[0], usage: updatedUsage })
    } catch (err) {
        console.error('Error creating snippet:', err)

        if (err instanceof Error && err.message.includes('authenticated')) {
            return error('User must be authenticated')
        }

        return error('Failed to create snippet. Please try again later.')
    }
}
