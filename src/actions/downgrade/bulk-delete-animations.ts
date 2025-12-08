'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'

/**
 * Server Action: Bulk delete animations (optimized batch delete)
 */
export async function bulkDeleteAnimations(
  animationIds: string[]
): Promise<ActionResult<{ deletedCount: number }>> {
  try {
    if (!animationIds || animationIds.length === 0) {
      return error('No animation IDs provided')
    }

    // Validate input
    const validIds = animationIds.filter((id) => id && typeof id === 'string')
    if (validIds.length === 0) {
      return error('No valid animation IDs provided')
    }

    const { user, supabase } = await requireAuth()

    // First, remove animations from collections (batch update)
    const { data: collections, error: collectionError } = await supabase
      .from('animation_collection')
      .select('id, animations')
      .eq('user_id', user.id)

    if (collectionError) {
      console.error('Error fetching collections for bulk delete:', collectionError)
      // Continue with deletion even if collection update fails
    } else if (collections && collections.length > 0) {
      // Update collections in parallel
      const updatePromises = collections.map(async (collection) => {
        const currentAnimations = Array.isArray(collection.animations)
          ? collection.animations
          : []
        const updatedAnimations = currentAnimations.filter(
          (id: string) => !validIds.includes(id)
        )

        if (updatedAnimations.length !== currentAnimations.length) {
          const { error: updateError } = await supabase
            .from('animation_collection')
            .update({
              animations: updatedAnimations,
              updated_at: new Date().toISOString(),
            })
            .eq('id', collection.id)
            .eq('user_id', user.id)

          if (updateError) {
            console.error(`Error updating collection ${collection.id}:`, updateError)
          }
        }
      })

      await Promise.all(updatePromises)
    }

    // Batch delete animations using Supabase's .in() filter
    const { data: deletedRows, error: deleteError } = await supabase
      .from('animation')
      .delete()
      .in('id', validIds)
      .eq('user_id', user.id)
      .select('id')

    if (deleteError) {
      console.error('Error bulk deleting animations:', deleteError)
      return error('Failed to delete animations. Please try again later.')
    }

    const deletedCount = deletedRows?.length ?? 0

    if (deletedCount === 0) {
      return error('No animations were deleted. They may have already been deleted or you do not have permission.')
    }

    if (deletedCount < validIds.length) {
      console.warn(
        `Only ${deletedCount} of ${validIds.length} animations were deleted. Some may have already been deleted.`
      )
    }

    // Revalidate relevant paths
    revalidatePath('/animations')
    revalidatePath('/animate')

    return success({ deletedCount })
  } catch (err) {
    console.error('Error bulk deleting animations:', err)

    if (err instanceof Error && err.message.includes('authenticated')) {
      return error('User must be authenticated')
    }

    return error('Failed to delete animations. Please try again later.')
  }
}

