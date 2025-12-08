'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { insertCollection } from '@/lib/services/database/collections'
import type { Collection, Snippet } from '@/features/snippets/dtos'
import type { PlanId } from '@/lib/config/plans'

export type CreateCollectionInput = {
    title: string
    snippets?: Snippet[]
}

/**
 * Server Action: Create a new collection
 * 
 * @param input - The collection data to create
 * @returns ActionResult with created collection or error message
 */
export async function createCollection(
    input: CreateCollectionInput
): Promise<ActionResult<Collection>> {
    try {
        const { title, snippets } = input

        const sanitizedTitle = title?.trim() || 'Untitled'

        const { user, supabase } = await requireAuth()

        const { data: folderLimit, error: folderLimitError } = await supabase.rpc('check_folder_limit', {
            p_user_id: user.id
        })

        if (folderLimitError) {
            console.error('Error checking folder limit:', folderLimitError)
            return error('Failed to verify folder limit. Please try again.')
        }

        const canCreateFolder = Boolean(
            folderLimit?.can_create ??
            folderLimit?.canCreate ??
            folderLimit?.can_save ??
            folderLimit?.canSave ??
            false
        )

        if (!canCreateFolder) {
            const plan = (folderLimit?.plan as PlanId | undefined) ?? 'free'
            if (plan === 'free') {
                return error('Free plan does not include folders. Upgrade to Started to organize your snippets.')
            }
            if (plan === 'started') {
                return error('You have reached your 10 folder limit. Upgrade to Pro for unlimited folders.')
            }
            return error('Folder limit reached. Please upgrade your plan.')
        }

        const data = await insertCollection({
            user_id: user.id,
            title: sanitizedTitle,
            snippets: snippets as any || [],
            supabase
        })

        if (!data || data.length === 0) {
            return error('Failed to create collection')
        }

        // Revalidate the collections list
        revalidatePath('/collections')
        revalidatePath('/')

        return success(data[0] as Collection)
    } catch (err) {
        console.error('Error creating collection:', err)

        if (err instanceof Error && err.message.includes('authenticated')) {
            return error('User must be authenticated')
        }

        return error('Failed to create collection. Please try again later.')
    }
}
