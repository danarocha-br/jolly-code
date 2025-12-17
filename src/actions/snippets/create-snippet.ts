'use server'

import { revalidatePath } from 'next/cache'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { insertSnippet } from '@/lib/services/database/snippets'
import type { Snippet } from '@/features/snippets/dtos'
import { createSnippetInputSchema, formatZodError } from '@/actions/utils/validation'
import { withAuthAction } from '@/actions/utils/with-auth'
import type { UsageLimitCheck } from '@/lib/services/usage-limits'
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
    const parsedInput = createSnippetInputSchema.safeParse(input)

    if (!parsedInput.success) {
      return error(formatZodError(parsedInput.error) ?? 'Invalid snippet data')
    }

    const payload = parsedInput.data

    return withAuthAction(payload, async ({ id, title, code, language, url }, { user, supabase }) => {
      // Check snippet limit before allowing save
      const { data: limitCheckRaw, error: limitError } = await supabase.rpc('check_snippet_limit', {
        target_user_id: user.id
      })

      if (limitError) {
        console.error('Error checking snippet limit:', limitError)
        return error('Failed to verify save limit. Please try again.')
      }

      // Guard against null RPC response
      if (!limitCheckRaw || typeof limitCheckRaw !== 'object') {
        console.error('Invalid RPC response from check_snippet_limit:', limitCheckRaw)
        return error('Failed to verify save limit. Please try again.')
      }

      // Map RPC response (can be camelCase or snake_case) to camelCase UsageLimitCheck type
      const rpcResponse = limitCheckRaw as {
        can_save?: boolean
        canSave?: boolean
        current?: number | null
        max?: number | null
        plan?: string | null
        over_limit?: number | null
        overLimit?: number | null
      }

      // Normalize plan value from database ("started" -> "starter")
      const rawPlan = rpcResponse.plan ?? 'free';
      const normalizedPlan = rawPlan === 'started' ? 'starter' : rawPlan;

      const limitCheck: UsageLimitCheck = {
        canSave: Boolean(rpcResponse.canSave ?? rpcResponse.can_save ?? false),
        current: rpcResponse.current ?? 0,
        max: rpcResponse.max ?? null,
        plan: (normalizedPlan as UsageLimitCheck['plan']) ?? 'free',
        overLimit: rpcResponse.overLimit ?? rpcResponse.over_limit ?? undefined,
      }

      // Compute overLimit locally if not provided
      const current = limitCheck.current ?? 0
      const max = limitCheck.max ?? 0
      const overLimit = limitCheck.overLimit ?? Math.max(current - max, 0)

      if (!limitCheck.canSave) {
        const plan = limitCheck.plan

        if (plan === 'free') {
          return error(`You have ${current} snippets but the Free plan allows ${max}. Delete items or upgrade to save again. Over limit: ${overLimit}.`)
        } else if (plan === 'starter') {
          return error(`You've reached your Starter limit (${current}/${max}). Upgrade to Pro for unlimited snippets!`)
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
    })
  } catch (err) {
    console.error('Error creating snippet:', err)

    return error('Failed to create snippet. Please try again later.')
  }
}
