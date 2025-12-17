'use server'

import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { getUsersSnippetsList } from '@/lib/services/database/snippets'
import type { Snippet } from '@/features/snippets/dtos'

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

/**
 * Server Action: Get snippets metadata (id, title, created_at, language)
 * Optimized for list views where code content is not needed.
 */
export async function getSnippetsMetadata(): Promise<ActionResult<Pick<Snippet, 'id' | 'title' | 'created_at' | 'language'>[]>> {
	try {
		const { user, supabase } = await requireAuth()

		const data = await getUsersSnippetsList<Pick<Snippet, 'id' | 'title' | 'created_at' | 'language'>>({
			user_id: user.id,
			supabase,
			columns: 'id, title, created_at, language'
		})

		if (!data) {
			return error('No snippets found')
		}

		return success(data)
	} catch (err) {
		console.error('Error fetching snippets metadata:', err)

		if (err instanceof Error && err.message.includes('authenticated')) {
			return error('User must be authenticated')
		}

		return error('Failed to fetch snippets. Please try again later.')
	}
}
