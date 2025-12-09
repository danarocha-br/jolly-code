'use server'

import { createClient } from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthError } from './auth-error'

export type AuthResult = {
	user: {
		id: string
		email?: string
	}
	supabase: SupabaseClient
}

// Re-export AuthError for convenience
export { AuthError }

/**
 * Ensures the user is authenticated and returns user + supabase client
 * Throws an error if user is not authenticated
 */
export async function requireAuth(): Promise<AuthResult> {
	const supabase = await createClient()

	const { data: { user }, error } = await supabase.auth.getUser()

	if (error) {
		console.error('Auth error:', error)
		throw new AuthError(`Authentication failed: ${error.message}`)
	}

	if (!user) {
		throw new AuthError('User must be authenticated')
	}

	return {
		user: {
			id: user.id,
			email: user.email
		},
		supabase
	}
}

/**
 * Gets the current user if authenticated, returns null otherwise
 */
export async function getAuthUser(): Promise<AuthResult | null> {
	try {
		return await requireAuth()
	} catch {
		return null
	}
}
