'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'

/**
 * Server Action: Bulk delete snippet collections
 */
export async function bulkDeleteSnippetCollections(
	collectionIds: string[]
): Promise<ActionResult<{ deletedCount: number }>> {
	try {
		if (!collectionIds || collectionIds.length === 0) {
			return error('No collection IDs provided')
		}

		// Validate input
		const validIds = collectionIds.filter((id) => id && typeof id === 'string')
		if (validIds.length === 0) {
			return error('No valid collection IDs provided')
		}

		const { user, supabase } = await requireAuth()

		// Batch delete collections using Supabase's .in() filter
		const { data: deletedRows, error: deleteError } = await supabase
			.from('collection')
			.delete()
			.in('id', validIds)
			.eq('user_id', user.id)
			.select('id')

		if (deleteError) {
			console.error('Error bulk deleting snippet collections:', deleteError)
			return error('Failed to delete collections. Please try again later.')
		}

		const deletedCount = deletedRows?.length ?? 0

		// Try to refresh usage counters explicitly since triggers might be missing for collections
		try {
			await supabase.rpc('refresh_usage_counters', { p_user_id: user.id })
		} catch (e) {
			console.warn('Failed to refresh usage counters:', e)
		}

		// Clear usage limits cache to ensure up-to-date counts
		try {
			const { getUsageLimitsCacheProvider } = await import('@/lib/services/usage-limits-cache')
			getUsageLimitsCacheProvider().delete(user.id)
		} catch (e) {
			console.warn('Failed to clear usage cache:', e)
		}

		// Revalidate relevant paths
		revalidatePath('/collections')
		revalidatePath('/')

		return success({ deletedCount })
	} catch (err) {
		console.error('Error bulk deleting snippet collections:', err)

		if (err instanceof Error && err.message.includes('authenticated')) {
			return error('User must be authenticated')
		}

		return error('Failed to delete collections. Please try again later.')
	}
}
