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
 * 
 * Note: If the error is "user_not_found" (user was deleted), we attempt to sign out
 * to clear the invalid session, but still throw an error to prevent the action from proceeding.
 */
export async function requireAuth(): Promise<AuthResult> {
	const supabase = await createClient()

	const { data: { user }, error } = await supabase.auth.getUser()

	if (error) {
		console.error('Auth error:', error)
		
		// If user was deleted (user_not_found), attempt to clear the session
		// This helps prevent repeated errors from invalid JWTs
		if (error.code === 'user_not_found' || 
		    // Best-effort fallback: tolerate false negatives, don't depend on exact message text
		    error.message?.includes('User from sub claim in JWT does not exist')) {
			try {
				await supabase.auth.signOut()
			} catch (signOutError) {
				// Ignore sign out errors - the session is already invalid
			}
		}
		
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
	} catch (e) {
		// Log errors in non-production environments for debugging
		if (process.env.NODE_ENV !== 'production') {
			console.debug('[getAuthUser] Authentication check failed:', e)
		}
		return null
	}
}
