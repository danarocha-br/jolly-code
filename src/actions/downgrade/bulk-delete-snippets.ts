'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'

/**
 * Server Action: Bulk delete snippets (optimized batch delete)
 */
export async function bulkDeleteSnippets(
  snippetIds: string[]
): Promise<ActionResult<{ deletedCount: number }>> {
  try {
    if (!snippetIds || snippetIds.length === 0) {
      return error('No snippet IDs provided')
    }

    // Validate input
    const validIds = snippetIds.filter((id) => id && typeof id === 'string')
    if (validIds.length === 0) {
      return error('No valid snippet IDs provided')
    }

    const { user, supabase } = await requireAuth()

    // Batch delete using Supabase's .in() filter for better performance
    const { data: deletedRows, error: deleteError } = await supabase
      .from('snippet')
      .delete()
      .in('id', validIds)
      .eq('user_id', user.id)
      .select('id')

    if (deleteError) {
      console.error('Error bulk deleting snippets:', deleteError)
      return error('Failed to delete snippets. Please try again later.')
    }

    const deletedCount = deletedRows?.length ?? 0

    if (deletedCount === 0) {
      console.warn('No snippets deleted — none found or already removed')
      return success({ deletedCount: 0 })
    }

    if (deletedCount < validIds.length) {
      console.warn(
        `Only ${deletedCount} of ${validIds.length} snippets were deleted. Some may have already been deleted.`
      )
    }

    // Clear usage limits cache to ensure up-to-date counts
    try {
      const { getUsageLimitsCacheProvider } = await import('@/lib/services/usage-limits-cache')
      getUsageLimitsCacheProvider().delete(user.id)
    } catch (e) {
      console.warn('Failed to clear usage cache:', e)
    }

    // Revalidate relevant paths
    revalidatePath('/snippets')
    revalidatePath('/')

    return success({ deletedCount })
  } catch (err) {
    console.error('Error bulk deleting snippets:', err)

    if (err instanceof Error && err.message.includes('authenticated')) {
      return error('User must be authenticated')
    }

    return error('Failed to delete snippets. Please try again later.')
  }
}

