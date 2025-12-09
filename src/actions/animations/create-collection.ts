'use server'

import { revalidatePath } from 'next/cache'

import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { createAnimationCollection as createAnimationCollectionDb } from '@/lib/services/database/animations'
import type { AnimationCollection, Animation } from '@/features/animations/dtos'
import type { PlanId } from '@/lib/config/plans'

export type CreateAnimationCollectionInput = {
  title: string
  animations?: Animation[]
}

export async function createAnimationCollection(
  input: CreateAnimationCollectionInput
): Promise<ActionResult<AnimationCollection>> {
  try {
    const { title, animations } = input
    const sanitizedTitle = title?.trim() || 'Untitled'

    const { user, supabase } = await requireAuth()

    const { data: folderLimit, error: folderLimitError } = await supabase.rpc('check_folder_limit', {
      p_user_id: user.id
    })

    if (folderLimitError) {
      console.error('Error checking folder limit:', folderLimitError)
      return error('Failed to verify folder limit. Please try again.')
    }

    const canCreateFolder = Boolean(folderLimit?.canCreate ?? false)

    if (!canCreateFolder) {
      const plan = (folderLimit?.plan as PlanId | undefined) ?? 'free'
      if (plan === 'free') {
        return error('Free plan does not include folders. Upgrade to Started to organize your animations.')
      }
      if (plan === 'started') {
        return error('You have reached your 10 folder limit. Upgrade to Pro for unlimited folders.')
      }
      return error('Folder limit reached. Please upgrade your plan.')
    }

    const data = await createAnimationCollectionDb({
      user_id: user.id,
      title: sanitizedTitle,
      animations: animations as any,
      supabase
    })

    if (!data || data.length === 0) {
      return error('Failed to create collection')
    }

    revalidatePath('/animations')
    revalidatePath('/animate')

    return success(data[0] as AnimationCollection)
  } catch (err) {
    console.error('Error creating animation collection:', err)

    if (err instanceof Error && err.message.includes('authenticated')) {
      return error('User must be authenticated')
    }

    return error('Failed to create collection. Please try again later.')
  }
}
