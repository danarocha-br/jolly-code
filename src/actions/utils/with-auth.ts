'use server'

import { requireAuth, type AuthResult } from '@/actions/utils/auth'

export async function withAuthAction<Input, Output>(
    input: Input,
    handler: (input: Input, ctx: AuthResult) => Promise<Output>
): Promise<Output> {
    const ctx = await requireAuth()
    return handler(input, ctx)
}
