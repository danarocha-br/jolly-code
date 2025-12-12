'use server'

import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { getUsersAnimationsList } from '@/lib/services/database/animations'
import type { Animation } from '@/features/animations/dtos'

export async function getAnimations(): Promise<ActionResult<Animation[]>> {
	try {
		const { user, supabase } = await requireAuth()

		const data = await getUsersAnimationsList({
			user_id: user.id,
			supabase
		})

		if (!data) {
			return error('No animations found')
		}

		return success(data as Animation[])
	} catch (err) {
		console.error('Error fetching animations:', err)

		if (err instanceof Error && err.message.includes('authenticated')) {
			return error('User must be authenticated')
		}

		return error('Failed to fetch animations. Please try again later.')
	}
}

/**
 * Server Action: Get animations metadata (id, title, created_at)
 * Optimized for list views where content is not needed.
 */
export async function getAnimationsMetadata(): Promise<ActionResult<Pick<Animation, 'id' | 'title' | 'created_at'>[]>> {
	try {
		const { user, supabase } = await requireAuth()

		const data = await getUsersAnimationsList<Pick<Animation, 'id' | 'title' | 'created_at'>>({
			user_id: user.id,
			supabase,
			columns: 'id, title, created_at'
		})

		if (!data) {
			return error('No animations found')
		}

		return success(data)
	} catch (err) {
		console.error('Error fetching animations metadata:', err)

		if (err instanceof Error && err.message.includes('authenticated')) {
			return error('User must be authenticated')
		}

		return error('Failed to fetch animations. Please try again later.')
	}
}
