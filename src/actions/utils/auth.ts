'use server'

import { createClient } from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export type AuthResult = {
	user: {
		id: string
		email?: string
	}
	supabase: SupabaseClient
}

/**
 * Custom error class for authentication failures
 * Allows robust error detection via instanceof checks
 */
export class AuthError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'AuthError'
		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, AuthError)
		}
	}
}

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
