import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import type { User, SupabaseClient } from '@supabase/supabase-js'

type RouteAuthContext = {
	request: NextRequest
	supabase: SupabaseClient
	user: User
}

/**
 * Wrap a Next.js route handler to enforce Supabase auth before executing.
 * Returns 401 when the request is unauthenticated.
 */
export function withAuthRoute(
	handler: (ctx: RouteAuthContext) => Promise<NextResponse>
) {
	return async (request: NextRequest): Promise<NextResponse> => {
		const supabase = await createClient()
		const { data: { user }, error } = await supabase.auth.getUser()

		if (error || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		return handler({ request, supabase, user })
	}
}
