/**
 * Standard response type for Server Actions
 */
export type ActionResult<T> =
    | { data: T; error?: never }
    | { data?: never; error: string }

/**
 * Helper to create success response
 */
export function success<T>(data: T): ActionResult<T> {
    return { data }
}

/**
 * Helper to create error response
 */
export function error(message: string): ActionResult<never> {
    return { error: message }
}
