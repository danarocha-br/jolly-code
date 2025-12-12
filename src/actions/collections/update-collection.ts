'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { updateCollection as updateCollectionInDb } from '@/lib/services/database/collections'
import type { Collection, Snippet } from '@/features/snippets/dtos'

export type UpdateCollectionInput = {
	id: string
	title?: string
	snippets?: Snippet[]
}

/**
 * Server Action: Update an existing collection
 * 
 * @param input - The collection data to update
 * @returns ActionResult with updated collection or error message
 */
export async function updateCollection(
	input: UpdateCollectionInput
): Promise<ActionResult<Collection>> {
	try {
		const { id, title, snippets } = input

		if (!id) {
			return error('Collection ID is required')
		}

		const { user, supabase } = await requireAuth()

		const data = await updateCollectionInDb({
			id,
			user_id: user.id,
			title,
			snippets,
			supabase
		} as any)

		if (!data) {
			return error('Failed to update collection')
		}

		// updateCollectionInDb returns an array, extract the first element
		const collection = Array.isArray(data) ? data[0] : data
		if (!collection) {
			return error('Failed to update collection')
		}
		// Debug log to verify title preservation
		console.log('[updateCollection] Returning collection:', { id: collection.id, title: collection.title, wasArray: Array.isArray(data) });

		// Revalidate relevant paths
		revalidatePath('/collections')
		revalidatePath('/')

		return success(collection)
	} catch (err) {
		console.error('Error updating collection:', err)

		if (err instanceof Error && err.message.includes('authenticated')) {
			return error('User must be authenticated')
		}

		return error('Failed to update collection. Please try again later.')
	}
}
